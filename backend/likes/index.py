import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import random

def handler(event: dict, context) -> dict:
    '''API для управления лайками постов'''
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': ''
        }
    
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        if method == 'GET':
            query_params = event.get('queryStringParameters') or {}
            post_id = query_params.get('postId')
            
            if post_id:
                cur.execute('''
                    SELECT 
                        l.id, l.liked_at, l.is_mutual, l.delay_minutes,
                        a.username, a.avatar_url
                    FROM likes l
                    JOIN accounts a ON l.account_id = a.id
                    WHERE l.post_id = %s
                    ORDER BY l.liked_at ASC
                ''', (post_id,))
            else:
                cur.execute('''
                    SELECT 
                        l.id, l.post_id, l.liked_at, l.is_mutual, l.delay_minutes,
                        a.username, a.avatar_url,
                        p.content as post_content
                    FROM likes l
                    JOIN accounts a ON l.account_id = a.id
                    JOIN posts p ON l.post_id = p.id
                    ORDER BY l.liked_at DESC
                    LIMIT 100
                ''')
            
            likes = cur.fetchall()
            
            for like in likes:
                if like['liked_at']:
                    like['liked_at'] = like['liked_at'].isoformat()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'likes': likes})
            }
        
        elif method == 'POST':
            data = json.loads(event.get('body', '{}'))
            post_id = data.get('postId')
            likes_count = data.get('likesCount', 2)
            is_mutual = data.get('isMutual', True)
            
            if not post_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'postId is required'})
                }
            
            cur.execute('SELECT account_id FROM posts WHERE id = %s', (post_id,))
            post = cur.fetchone()
            
            if not post:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Post not found'})
                }
            
            post_author_id = post['account_id']
            
            cur.execute('''
                SELECT id FROM accounts 
                WHERE is_active = true AND id != %s
                ORDER BY RANDOM()
                LIMIT %s
            ''', (post_author_id, likes_count))
            
            accounts = cur.fetchall()
            created_likes = []
            
            for account in accounts:
                delay = random.randint(5, 15)
                
                cur.execute('''
                    INSERT INTO likes (post_id, account_id, is_mutual, delay_minutes)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (post_id, account_id) DO NOTHING
                    RETURNING id, liked_at, is_mutual, delay_minutes
                ''', (post_id, account['id'], is_mutual, delay))
                
                like = cur.fetchone()
                if like:
                    if like['liked_at']:
                        like['liked_at'] = like['liked_at'].isoformat()
                    created_likes.append(like)
            
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'likes': created_likes,
                    'count': len(created_likes)
                })
            }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()
