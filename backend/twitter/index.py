import json
import os
import psycopg2
from twikit import Client
import asyncio


def handler(event: dict, context) -> dict:
    '''API для работы с Twitter через auth_token: проверка подключения и публикация постов'''
    
    method = event.get('httpMethod', 'GET')
    
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    }
    
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}
    
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
            SELECT auth_token, ct0
            FROM {schema}.twitter_auth 
            ORDER BY created_at DESC 
            LIMIT 1
        """)
        
        row = cur.fetchone()
        cur.close()
        conn.close()
        
        if not row or not row[0]:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Twitter auth_token not configured',
                    'message': 'Пожалуйста, добавьте auth_token в настройках'
                })
            }
        
        auth_token = row[0]
        ct0 = row[1] if len(row) > 1 and row[1] else None
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'Failed to load credentials',
                'message': f'Не удалось загрузить токен из базы: {str(e)}'
            })
        }
    
    # Initialize Twitter client
    try:
        client = Client('en-US')
        client.set_cookies({
            'auth_token': auth_token,
            'ct0': ct0
        })
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'Failed to initialize Twitter client',
                'message': f'Ошибка инициализации: {str(e)}'
            })
        }
    
    # GET: Check connection
    if method == 'GET':
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            user = loop.run_until_complete(client.user_by_screen_name('twitter'))
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'success': True,
                    'message': 'Подключение к Twitter успешно!',
                    'user': {
                        'id': str(user.id) if hasattr(user, 'id') else 'unknown',
                        'username': user.screen_name if hasattr(user, 'screen_name') else 'unknown',
                        'name': user.name if hasattr(user, 'name') else 'unknown'
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
                    'message': f'Неверный auth_token: {str(e)}'
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
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            tweet = loop.run_until_complete(client.create_tweet(text))
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'success': True,
                    'message': 'Пост успешно опубликован!',
                    'tweet': {
                        'id': str(tweet.id) if hasattr(tweet, 'id') else 'unknown',
                        'text': text,
                        'url': f'https://twitter.com/i/web/status/{tweet.id}' if hasattr(tweet, 'id') else None
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
