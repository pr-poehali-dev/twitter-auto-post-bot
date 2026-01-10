import json
import os
import psycopg2
from tweepy import Client, API
from tweepy.auth import OAuthHandler


def handler(event: dict, context) -> dict:
    '''API для работы с Twitter: проверка подключения и публикация постов'''
    
    method = event.get('httpMethod', 'GET')
    
    # CORS headers
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    }
    
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}
    
    # Get credentials from database
    dsn = os.environ.get('DATABASE_URL')
    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
    
    if not dsn:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'Database not configured',
                'message': 'База данных не настроена'
            })
        }
    
    try:
        conn = psycopg2.connect(dsn)
        cur = conn.cursor()
        
        cur.execute(f"""
            SELECT api_key, api_secret, access_token, access_token_secret 
            FROM {schema}.twitter_settings 
            ORDER BY created_at DESC 
            LIMIT 1
        """)
        
        row = cur.fetchone()
        cur.close()
        conn.close()
        
        if not row or not all(row):
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Twitter API credentials not configured',
                    'message': 'Пожалуйста, добавьте все 4 ключа Twitter API в настройках'
                })
            }
        
        api_key, api_secret, access_token, access_token_secret = row
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'Failed to load credentials',
                'message': f'Не удалось загрузить ключи из базы: {str(e)}'
            })
        }
    
    # Initialize Twitter client
    try:
        client = Client(
            consumer_key=api_key,
            consumer_secret=api_secret,
            access_token=access_token,
            access_token_secret=access_token_secret
        )
        
        # Also initialize API v1.1 for media uploads if needed
        auth = OAuthHandler(api_key, api_secret)
        auth.set_access_token(access_token, access_token_secret)
        api = API(auth)
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'Failed to initialize Twitter client',
                'message': str(e)
            })
        }
    
    # GET: Check connection
    if method == 'GET':
        try:
            user = client.get_me()
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'success': True,
                    'message': 'Подключение к Twitter успешно!',
                    'user': {
                        'id': user.data.id,
                        'username': user.data.username,
                        'name': user.data.name
                    }
                })
            }
        except Exception as e:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'error': 'Authentication failed',
                    'message': f'Не удалось подключиться к Twitter: {str(e)}'
                })
            }
    
    # POST: Create tweet
    if method == 'POST':
        try:
            body = json.loads(event.get('body', '{}'))
            text = body.get('text', '')
            
            if not text:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({
                        'error': 'Text is required',
                        'message': 'Текст поста не может быть пустым'
                    })
                }
            
            # Create tweet
            response = client.create_tweet(text=text)
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'success': True,
                    'message': 'Пост успешно опубликован!',
                    'tweet': {
                        'id': response.data['id'],
                        'text': text
                    }
                })
            }
            
        except Exception as e:
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'error': 'Failed to create tweet',
                    'message': f'Ошибка при публикации: {str(e)}'
                })
            }
    
    return {
        'statusCode': 405,
        'headers': headers,
        'body': json.dumps({'error': 'Method not allowed'})
    }