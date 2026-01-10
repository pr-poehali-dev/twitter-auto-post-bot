import json
import os
import psycopg2
import requests


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
        ct0 = row[1] if len(row) > 1 and row[1] else auth_token
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'Failed to load credentials',
                'message': f'Не удалось загрузить токен из базы: {str(e)}'
            })
        }
    
    # Prepare Twitter API headers
    twitter_headers = {
        'authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
        'cookie': f'auth_token={auth_token}; ct0={ct0}',
        'x-csrf-token': ct0,
        'content-type': 'application/json',
        'x-twitter-active-user': 'yes',
        'x-twitter-auth-type': 'OAuth2Session',
        'x-twitter-client-language': 'en'
    }
    
    # GET: Check connection (verify credentials)
    if method == 'GET':
        try:
            response = requests.get(
                'https://api.twitter.com/1.1/account/verify_credentials.json',
                headers=twitter_headers,
                timeout=10
            )
            
            if response.status_code == 200:
                user_data = response.json()
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'success': True,
                        'message': 'Подключение к Twitter успешно!',
                        'user': {
                            'id': user_data.get('id_str'),
                            'username': user_data.get('screen_name'),
                            'name': user_data.get('name')
                        }
                    })
                }
            else:
                return {
                    'statusCode': 401,
                    'headers': headers,
                    'body': json.dumps({
                        'success': False,
                        'error': 'Authentication failed',
                        'message': f'Неверный auth_token. Код ошибки: {response.status_code}'
                    })
                }
                
        except Exception as e:
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'error': 'Connection error',
                    'message': f'Ошибка подключения: {str(e)}'
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
            
            tweet_data = {
                'text': text,
                'variables': {
                    'tweet_text': text,
                    'dark_request': False,
                    'media': {
                        'media_entities': [],
                        'possibly_sensitive': False
                    },
                    'semantic_annotation_ids': []
                },
                'features': {
                    'tweetypie_unmention_optimization_enabled': True,
                    'responsive_web_edit_tweet_api_enabled': True,
                    'graphql_is_translatable_rweb_tweet_is_translatable_enabled': True,
                    'view_counts_everywhere_api_enabled': True,
                    'longform_notetweets_consumption_enabled': True,
                    'responsive_web_twitter_article_tweet_consumption_enabled': False,
                    'tweet_awards_web_tipping_enabled': False,
                    'longform_notetweets_rich_text_read_enabled': True,
                    'longform_notetweets_inline_media_enabled': True,
                    'responsive_web_graphql_exclude_directive_enabled': True,
                    'verified_phone_label_enabled': False,
                    'freedom_of_speech_not_reach_fetch_enabled': True,
                    'standardized_nudges_misinfo': True,
                    'tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled': True,
                    'responsive_web_media_download_video_enabled': False,
                    'responsive_web_graphql_skip_user_profile_image_extensions_enabled': False,
                    'responsive_web_graphql_timeline_navigation_enabled': True,
                    'responsive_web_enhance_cards_enabled': False
                }
            }
            
            response = requests.post(
                'https://twitter.com/i/api/graphql/SoVnbfCycZ7fERGCwpZkYA/CreateTweet',
                headers=twitter_headers,
                json=tweet_data,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                tweet_id = result.get('data', {}).get('create_tweet', {}).get('tweet_results', {}).get('result', {}).get('rest_id')
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'success': True,
                        'message': 'Пост успешно опубликован!',
                        'tweet': {
                            'id': tweet_id,
                            'text': text,
                            'url': f'https://twitter.com/i/web/status/{tweet_id}' if tweet_id else None
                        }
                    })
                }
            else:
                return {
                    'statusCode': 500,
                    'headers': headers,
                    'body': json.dumps({
                        'success': False,
                        'error': 'Failed to create tweet',
                        'message': f'Ошибка при публикации. Код: {response.status_code}, Ответ: {response.text[:200]}'
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