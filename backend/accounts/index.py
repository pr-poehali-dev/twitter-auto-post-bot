import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: dict, context) -> dict:
    '''API для управления Twitter аккаунтами'''
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': ''
        }
    
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        if method == 'GET':
            cur.execute('''
                SELECT id, username, avatar_url, is_active, created_at 
                FROM accounts 
                ORDER BY created_at DESC
            ''')
            accounts = cur.fetchall()
            
            for account in accounts:
                if account['created_at']:
                    account['created_at'] = account['created_at'].isoformat()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'accounts': accounts})
            }
        
        elif method == 'POST':
            data = json.loads(event.get('body', '{}'))
            username = data.get('username')
            auth_token = data.get('authToken')
            avatar_url = data.get('avatarUrl', '')
            
            if not username or not auth_token:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Username and authToken are required'})
                }
            
            cur.execute('''
                INSERT INTO accounts (username, auth_token, avatar_url)
                VALUES (%s, %s, %s)
                RETURNING id, username, avatar_url, is_active, created_at
            ''', (username, auth_token, avatar_url))
            
            account = cur.fetchone()
            conn.commit()
            
            if account['created_at']:
                account['created_at'] = account['created_at'].isoformat()
            
            return {
                'statusCode': 201,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'account': account})
            }
        
        elif method == 'PUT':
            data = json.loads(event.get('body', '{}'))
            account_id = data.get('id')
            is_active = data.get('isActive')
            
            if not account_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Account ID is required'})
                }
            
            cur.execute('''
                UPDATE accounts 
                SET is_active = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id, username, avatar_url, is_active
            ''', (is_active, account_id))
            
            account = cur.fetchone()
            conn.commit()
            
            if not account:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Account not found'})
                }
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'account': account})
            }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
        
    except psycopg2.IntegrityError as e:
        return {
            'statusCode': 409,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Account with this username already exists'})
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
