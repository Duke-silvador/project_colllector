"""Upload generated episode as PRIVATE and Made for Kids using user OAuth. Never logs tokens."""
import json
import os
from pathlib import Path
import sys

SCOPES=['https://www.googleapis.com/auth/youtube.upload']


def main():
    needed=['YT_CLIENT_ID','YT_CLIENT_SECRET','YT_REFRESH_TOKEN']
    missing=[k for k in needed if not os.getenv(k)]
    if missing:
        print('SKIPPED YOUTUBE UPLOAD: configure repository secrets:',', '.join(missing))
        return 0
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload

    folder=Path(sys.argv[1] if len(sys.argv)>1 else 'build')
    meta=json.loads((folder/'metadata.json').read_text(encoding='utf-8'))
    creds=Credentials(token=None,refresh_token=os.environ['YT_REFRESH_TOKEN'],
                      token_uri='https://oauth2.googleapis.com/token',
                      client_id=os.environ['YT_CLIENT_ID'],client_secret=os.environ['YT_CLIENT_SECRET'],
                      scopes=SCOPES)
    creds.refresh(Request())
    youtube=build('youtube','v3',credentials=creds,cache_discovery=False)
    body={
       'snippet':{'title':meta['title'][:100],'description':meta['description'][:5000],
                  'tags':meta['tags'],'categoryId':'27','defaultLanguage':'en'},
       'status':{'privacyStatus':'private','selfDeclaredMadeForKids':True,
                 'license':'youtube'}
    }
    request=youtube.videos().insert(part='snippet,status',body=body,
        media_body=MediaFileUpload(str(folder/'episode.mp4'),mimetype='video/mp4',resumable=True))
    response=None
    while response is None:
        status,response=request.next_chunk()
        if status:
            print(f'Upload {round(status.progress()*100)}%')
    video_id=response['id']
    print('PRIVATE video uploaded: https://studio.youtube.com/video/'+video_id+'/edit')
    try:
        youtube.thumbnails().set(videoId=video_id,
            media_body=MediaFileUpload(str(folder/'thumbnail.jpg'),mimetype='image/jpeg')).execute()
        print('Custom thumbnail uploaded.')
    except Exception as exc:
        print('Thumbnail upload failed; video upload succeeded:',str(exc)[:250])
    (folder/'upload_result.json').write_text(json.dumps({'video_id':video_id,'privacy':'private',
        'made_for_kids':True}),encoding='utf-8')
    return 0


if __name__=='__main__':
    raise SystemExit(main())
