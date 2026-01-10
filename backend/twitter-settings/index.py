import json
import os
import psycopg2


def handler(event: dict, context) -> dict:
    '''API для управления настройками Twitter: сохранение и получение ключей доступа'''
    
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
            'body': json.dumps({'error': 'Database not configured'})
        }
    
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    try:
        # GET: получить текущие настройки (без секретов)
        if method == 'GET':
            cur.execute(f"""
                SELECT 
                    CASE WHEN api_key IS NOT NULL AND api_key != '' THEN true ELSE false END as has_api_key,
                    CASE WHEN api_secret IS NOT NULL AND api_secret != '' THEN true ELSE false END as has_api_secret,
                    CASE WHEN access_token IS NOT NULL AND access_token != '' THEN true ELSE false END as has_access_token,
                    CASE WHEN access_token_secret IS NOT NULL AND access_token_secret != '' THEN true ELSE false END as has_access_token_secret,
                    created_at,
                    updated_at
                FROM {schema}.twitter_settings 
                ORDER BY created_at DESC 
                LIMIT 1
            """)
            
            row = cur.fetchone()
            
            if row:
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'configured': all([row[0], row[1], row[2], row[3]]),
                        'has_api_key': row[0],
                        'has_api_secret': row[1],
                        'has_access_token': row[2],
                        'has_access_token_secret': row[3],
                        'updated_at': str(row[5]) if row[5] else str(row[4])
                    })
                }
            else:
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'configured': False})
                }
        
        # POST: сохранить новые настройки
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            
            api_key = body.get('api_key', '').strip()
            api_secret = body.get('api_secret', '').strip()
            access_token = body.get('access_token', '').strip()
            access_token_secret = body.get('access_token_secret', '').strip()
            
            if not all([api_key, api_secret, access_token, access_token_secret]):
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({
                        'error': 'All fields are required',
                        'message': 'Все 4 ключа обязательны для заполнения'
                    })
                }
            
            # Удаляем старые настройки
            cur.execute(f"DELETE FROM {schema}.twitter_settings")
            
            # Добавляем новые
            cur.execute(f"""
                INSERT INTO {schema}.twitter_settings 
                (api_key, api_secret, access_token, access_token_secret)
                VALUES (%s, %s, %s, %s)
            """, (api_key, api_secret, access_token, access_token_secret))
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'success': True,
                    'message': 'Настройки Twitter успешно сохранены!'
                })
            }
        
        return {
            'statusCode': 405,
            'headers': headers,
            'body': json.dumps({'error': 'Method not allowed'})
        }
        
    except Exception as e:
        conn.rollback()
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': str(e),
                'message': f'Ошибка при работе с настройками: {str(e)}'
            })
        }
    finally:
        cur.close()
        conn.close()
