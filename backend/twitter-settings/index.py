import json
import os
import psycopg2


def handler(event: dict, context) -> dict:
    '''API для управления auth_token Twitter: сохранение и получение токена'''
    
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
        # GET: получить статус настроек
        if method == 'GET':
            cur.execute(f"""
                SELECT 
                    CASE WHEN auth_token IS NOT NULL AND auth_token != '' THEN true ELSE false END as has_auth_token,
                    created_at,
                    updated_at
                FROM {schema}.twitter_auth 
                ORDER BY created_at DESC 
                LIMIT 1
            """)
            
            row = cur.fetchone()
            
            if row:
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'configured': row[0],
                        'has_auth_token': row[0],
                        'updated_at': str(row[2]) if row[2] else str(row[1])
                    })
                }
            else:
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'configured': False})
                }
        
        # POST: сохранить новый auth_token
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            
            auth_token = body.get('auth_token', '').strip()
            ct0 = body.get('ct0', '').strip() or auth_token
            
            if not auth_token:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({
                        'error': 'auth_token is required',
                        'message': 'auth_token обязателен для заполнения'
                    })
                }
            
            # Удаляем старые настройки
            cur.execute(f"DELETE FROM {schema}.twitter_auth")
            
            # Добавляем новые
            cur.execute(f"""
                INSERT INTO {schema}.twitter_auth 
                (auth_token, ct0)
                VALUES (%s, %s)
            """, (auth_token, ct0))
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'success': True,
                    'message': 'auth_token успешно сохранён!'
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