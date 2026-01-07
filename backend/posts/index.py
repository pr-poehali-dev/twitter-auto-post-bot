import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

def handler(event: dict, context) -> dict:
    '''API для управления постами Twitter'''
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': ''
        }
    
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        if method == 'GET':
            cur.execute('''
                SELECT 
                    p.id, p.content, p.video_url, p.video_name,
                    p.scheduled_time, p.published_at, p.status,
                    p.twitter_post_id, p.created_at,
                    a.username as account_username,
                    COUNT(l.id) as likes_count
                FROM posts p
                LEFT JOIN accounts a ON p.account_id = a.id
                LEFT JOIN likes l ON p.id = l.post_id
                GROUP BY p.id, a.username
                ORDER BY p.scheduled_time DESC
            ''')
            posts = cur.fetchall()
            
            for post in posts:
                if post['scheduled_time']:
                    post['scheduled_time'] = post['scheduled_time'].isoformat()
                if post['published_at']:
                    post['published_at'] = post['published_at'].isoformat()
                if post['created_at']:
                    post['created_at'] = post['created_at'].isoformat()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'posts': posts})
            }
        
        elif method == 'POST':
            data = json.loads(event.get('body', '{}'))
            account_id = data.get('accountId')
            content = data.get('content')
            video_url = data.get('videoUrl')
            video_name = data.get('videoName')
            scheduled_time = data.get('scheduledTime')
            
            if not content or not scheduled_time:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Content and scheduledTime are required'})
                }
            
            cur.execute('''
                INSERT INTO posts (account_id, content, video_url, video_name, scheduled_time)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, content, video_url, video_name, scheduled_time, status, created_at
            ''', (account_id, content, video_url, video_name, scheduled_time))
            
            post = cur.fetchone()
            conn.commit()
            
            if post['scheduled_time']:
                post['scheduled_time'] = post['scheduled_time'].isoformat()
            if post['created_at']:
                post['created_at'] = post['created_at'].isoformat()
            
            return {
                'statusCode': 201,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'post': post})
            }
        
        elif method == 'PUT':
            data = json.loads(event.get('body', '{}'))
            post_id = data.get('id')
            status = data.get('status')
            twitter_post_id = data.get('twitterPostId')
            
            if not post_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Post ID is required'})
                }
            
            published_at = 'CURRENT_TIMESTAMP' if status == 'published' else 'NULL'
            
            cur.execute(f'''
                UPDATE posts 
                SET status = %s, 
                    twitter_post_id = %s,
                    published_at = {published_at},
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id, content, status, published_at, twitter_post_id
            ''', (status, twitter_post_id, post_id))
            
            post = cur.fetchone()
            conn.commit()
            
            if not post:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Post not found'})
                }
            
            if post.get('published_at'):
                post['published_at'] = post['published_at'].isoformat()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'post': post})
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
