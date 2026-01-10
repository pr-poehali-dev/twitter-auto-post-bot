import json
import os
import psycopg2
from twikit import Client
import asyncio


def handler(event: dict, context) -> dict:
    '''API для работы с Twitter через логин/пароль: проверка подключения и публикация постов'''
    
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
            SELECT auth_token
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
                    'error': 'Twitter credentials not configured',
                    'message': 'Пожалуйста, добавьте данные для входа в настройках'
                })
            }
        
        # auth_token на самом деле хранит username:password
        credentials = row[0].split(':', 1)
        if len(credentials) != 2:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Invalid credentials format',
                    'message': 'Неверный формат данных. Используйте username:password'
                })
            }
        
        username, password = credentials
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'Failed to load credentials',
                'message': f'Не удалось загрузить токен из базы: {str(e)}'
            })
        }
    
    # Initialize and login to Twitter
    try:
        client = Client('en-US')
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(client.login(
            auth_info_1=username,
            password=password
        ))
        
    except Exception as e:
        return {
            'statusCode': 401,
            'headers': headers,
            'body': json.dumps({
                'error': 'Login failed',
                'message': f'Не удалось войти в Twitter: {str(e)}'
            })
        }
    
    # GET: Check connection (login already done above)
    if method == 'GET':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'message': 'Вход в Twitter выполнен успешно!',
                'user': {
                    'username': username
                }
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