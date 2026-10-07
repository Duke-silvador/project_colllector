"""Optional OpenAI-compatible chat explanation; no network request on import."""
import json
import os
from pathlib import Path
from urllib.request import Request,urlopen


def explain(report):
    config={}
    for line in (Path(__file__).parent/'config/development.env').read_text().splitlines():
        if line and not line.startswith('#') and '=' in line:
            name,value=line.split('=',1);config[name]=value
    config.update(os.environ)
    body={'model':config['OPENAI_MODEL'],'messages':[
        {'role':'system','content':'Explain this deterministic tool report for a human reviewer. Preserve its facts and counts; state uncertainties.'},
        {'role':'user','content':json.dumps(report,ensure_ascii=False)}],'temperature':0}
    request=Request(config['OPENAI_BASE_URL'].rstrip('/')+'/chat/completions',data=json.dumps(body).encode(),headers={'Authorization':'Bearer '+config['OPENAI_API_KEY'],'Content-Type':'application/json'})
    with urlopen(request,timeout=30) as response:data=json.load(response)
    value=data['choices'][0]['message']['content']
    if not isinstance(value,str):raise ValueError('Expected text assistant content')
    return value
