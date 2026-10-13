#!/usr/bin/env python3
"""Zero-API, original preschool cartoon generator. Requires Pillow + FFmpeg + eSpeak."""
import argparse
from array import array
from dataclasses import dataclass
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import random
import shutil
import subprocess
import textwrap
import wave

from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT, RATE = 960, 540, 22050
WHITE = (255, 255, 255)
INK = (49, 65, 91)
COLORS = {
    "red": (239, 91, 100), "blue": (74, 154, 228),
    "yellow": (255, 198, 62), "purple": (164, 103, 204),
    "green": (83, 178, 125)
}
TOPICS = ("colors", "counting", "shapes")
FONT_PATHS = (
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
)


@dataclass
class Scene:
    kind: str
    headline: str
    speech: str
    focus: str = ""
    position: int = 0
    seconds: float = 0.0
    narration_path: str = ""


def font(size):
    for file in FONT_PATHS:
        if Path(file).exists():
            return ImageFont.truetype(file, size)
    return ImageFont.load_default()


def ellipse(d, x, y, r, fill):
    d.ellipse((round(x-r), round(y-r), round(x+r), round(y+r)), fill=fill)


def centered(d, x, y, word, size, color=INK):
    d.text((x, y), word, font=font(size), anchor="mm", fill=color,
           stroke_width=1, stroke_fill=(255,255,255))


def create_story(topic, seed):
    """Finite authored story frameworks. Not a claim of generative AI storytelling."""
    rng = random.Random(seed)
    hero = rng.choice(("Bibi Bunny", "Pip Puppy", "Mimi Kitten", "Toto Bear"))
    landscape = rng.choice(("the Rainbow Meadow", "the Sunny Valley", "the Starry Garden"))
    if topic == "colors":
        scenes = [Scene("intro", "THE COLOR QUEST", f"Hello! I'm {hero}. The flowers in {landscape} need their colors. Let's find them together!")]
        examples = (("red","balloon"),("blue","kite"),("yellow","sun"),("purple","flower"),("green","leaf"))
        rng.shuffle(examples := list(examples))
        for idx, (color, obj) in enumerate(examples):
            scenes.append(Scene("color", f"{color.upper()} {obj.upper()}", f"Look! A {color} {obj}! Can you say {color}? Great job!", color, idx))
        scenes.append(Scene("finish", "WE DID IT!", f"We found all five colors! {landscape} is bright again. Thank you for helping me!"))
        subtitle = "A Color-Finding Adventure"
    elif topic == "counting":
        objects = rng.choice(("stars", "apples", "butterflies"))
        scenes = [Scene("intro", "THE COUNTING PARADE", f"Hello! I'm {hero}. We're getting ready for a parade in {landscape}. Can you count with me?")]
        for n in range(1, 6):
            number = ("ONE", "TWO", "THREE", "FOUR", "FIVE")[n-1]
            scenes.append(Scene("count", f"{number}!", f"Let's count the {objects}. " + ", ".join(str(i) for i in range(1,n+1)) + f"! That makes {n}!", objects, n))
        scenes.append(Scene("finish", "COUNTING CHAMPIONS!", "One, two, three, four, five! The parade is ready. You counted every one. Hooray!"))
        subtitle = f"Counting 1–5 with {objects.title()}"
    else:
        scenes = [Scene("intro", "BUILD A SHAPE ROCKET", f"Hello! I'm {hero}. Let's build a pretend rocket using shapes. Ready for our shape adventure?")]
        shapes = ("circle","square","triangle","heart","oval")
        rng.shuffle(shapes := list(shapes))
        for idx, shape in enumerate(shapes):
            scenes.append(Scene("shape", f"{shape.upper()}", f"Here's a {shape}. Look at its outline. Can you say {shape}? Wonderful!", shape, idx))
        scenes.append(Scene("finish", "READY FOR LIFTOFF!", "We found five shapes for our pretend rocket. What a wonderful shape explorer you are!"))
        subtitle = "A Shape-Finding Adventure"
    return hero, landscape, subtitle, scenes


def make_narration(line, filename):
    synth = shutil.which("espeak-ng") or shutil.which("espeak")
    if not synth:
        raise RuntimeError("eSpeak not installed. Use --no-voice to create an instrumental episode.")
    result = subprocess.run([synth, "-s", "135", "-p", "58", "-a", "130", "-w", str(filename), line],
                            capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError("eSpeak failed: " + result.stderr[:300])
    with wave.open(str(filename), "rb") as w:
        return w.getnframes()/w.getframerate()


def read_narration(path):
    if not path:
        return array("h"), RATE
    with wave.open(path, "rb") as w:
        if w.getnchannels() != 1 or w.getsampwidth() != 2:
            raise RuntimeError("Expected 16-bit mono speech PCM")
        data = array("h")
        data.frombytes(w.readframes(w.getnframes()))
        return data, w.getframerate()


def music_and_voice(scenes, outfile, seed):
    """Original procedural pentatonic melody + synced spoken narration, no media downloads."""
    rng = random.Random(seed)
    pitches = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25]
    phrase = [rng.randrange(6) for _ in range(16)]
    result = array("h")
    for j, scene in enumerate(scenes):
        voice, voice_rate = read_narration(scene.narration_path)
        count = round(scene.seconds * RATE)
        for i in range(count):
            t = i / RATE
            beat = int(t * 2.4) % len(phrase)
            freq = pitches[phrase[(beat + j * 2) % len(phrase)]]
            phase = (t * 2.4) % 1
            envelope = min(1., phase * 14) * max(0., 1 - phase)**1.4
            melody = 1500 * envelope * (math.sin(math.tau * freq * t) + .22 * math.sin(math.tau * 2 * freq * t))
            bass = 410 * math.sin(math.tau * (pitches[phrase[j % len(phrase)]] / 4) * t)
            vi = round(i * voice_rate / RATE)
            speech = voice[vi] if vi < len(voice) else 0
            amp = melody + bass + speech * 1.05
            result.append(max(-32768, min(32767, round(amp))))
    with wave.open(str(outfile), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(result.tobytes())


def star(d, x, y, r, fill, points=5):
    coords = []
    for i in range(points*2):
        a = i * math.pi / points - math.pi/2
        radius = r if i%2==0 else r*0.48
        coords.append((x+radius*math.cos(a), y+radius*math.sin(a)))
    d.polygon(coords, fill=fill)


def character(d, name, x, y, t, color):
    y += 4 * math.sin(t * 4)
    coat = color
    d.ellipse((x-65, y+62, x-7, y+97), fill=(76,75,100))
    d.ellipse((x+7, y+62, x+65, y+97), fill=(76,75,100))
    d.ellipse((x-75, y-18, x+75, y+77), fill=coat)
    animal = name.split()[1]
    if animal == 'Bunny':
        d.ellipse((x-55,y-141,x-9,y-47),fill=coat)
        d.ellipse((x+9,y-141,x+55,y-47),fill=coat)
        d.ellipse((x-41,y-131,x-22,y-53),fill=(255,193,193))
        d.ellipse((x+22,y-131,x+41,y-53),fill=(255,193,193))
    elif animal == 'Kitten':
        d.polygon([(x-75,y-81),(x-39,y-120),(x-24,y-53)],fill=coat)
        d.polygon([(x+75,y-81),(x+39,y-120),(x+24,y-53)],fill=coat)
    elif animal == 'Bear':
        ellipse(d,x-52,y-64,29,coat)
        ellipse(d,x+52,y-64,29,coat)
    else:
        d.ellipse((x-91,y-81,x-50,y+3),fill=coat)
        d.ellipse((x+50,y-81,x+91,y+3),fill=coat)
    ellipse(d,x,y-29,74,coat)
    ellipse(d,x-25,y-42,6,(33,54,74))
    ellipse(d,x+25,y-42,6,(33,54,74))
    ellipse(d,x,y-20,8,(255,211,212))
    d.arc((x-25,y-22,x+25,y+14),0,180,fill=(51,61,76),width=3)


def scene_object(d, scene, t, rng, cx=670, cy=275):
    x = cx + 12*math.sin(t*1.8)
    y = cy + 11*math.cos(t*2.2)
    if scene.kind == 'color':
        color = COLORS[scene.focus]
        if scene.headline.endswith('BALLOON'):
            d.ellipse((x-76,y-80,x+76,y+77),fill=color,outline=WHITE,width=6)
            d.line((x,y+77,x+18,y+168),fill=INK,width=4)
        elif scene.headline.endswith('KITE'):
            d.polygon([(x,y-117),(x-98,y),(x,y+113),(x+98,y)],fill=color)
            d.line((x,y+113,x+37,y+165),fill=INK,width=4)
        elif scene.headline.endswith('SUN'):
            for k in range(12):
                a = k*math.pi/6
                d.line((x+84*math.cos(a),y+84*math.sin(a),x+113*math.cos(a),y+113*math.sin(a)),fill=color,width=9)
            ellipse(d,x,y,78,color)
        elif scene.headline.endswith('FLOWER'):
            d.line((x,y+40,x,y+130),fill=COLORS['green'],width=12)
            for k in range(6):
                a=k*math.pi/3
                ellipse(d,x+55*math.cos(a),y+55*math.sin(a),40,color)
            ellipse(d,x,y,37,COLORS['yellow'])
        else:
            d.polygon([(x-112,y+57),(x-34,y-92),(x+103,y-118),(x+70,y+60),(x-40,y+104)],fill=color)
            d.line((x-110,y+111,x+103,y-118),fill=(75,125,75),width=6)
    elif scene.kind == 'shape':
        fill = list(COLORS.values())[scene.position % 5]
        s = scene.focus
        if s=='circle': ellipse(d,x,y,95,fill)
        elif s=='square': d.rounded_rectangle((x-102,y-104,x+102,y+100),radius=6,fill=fill)
        elif s=='triangle': d.polygon([(x,y-117),(x-115,y+94),(x+115,y+94)],fill=fill)
        elif s=='oval': d.ellipse((x-131,y-75,x+131,y+77),fill=fill)
        elif s=='heart':
            d.ellipse((x-106,y-81,x+5,y+25),fill=fill)
            d.ellipse((x-5,y-81,x+106,y+25),fill=fill)
            d.polygon([(x-106,y-12),(x+106,y-12),(x,y+128)],fill=fill)
    elif scene.kind == 'count':
        n = scene.position
        for k in range(n):
            col = list(COLORS.values())[(k+scene.position)%5]
            xx = x-128+(k%3)*123
            yy = y-25+(k//3)*106
            if scene.focus == 'stars': star(d,xx,yy,42,col)
            elif scene.focus == 'apples':
                ellipse(d,xx,yy,36,col)
                d.line((xx,yy-35,xx+4,yy-53),fill=(83,119,69),width=5)
            else:
                d.ellipse((xx-34,yy-30,xx,yy+6),fill=col)
                d.ellipse((xx,yy-30,xx+34,yy+6),fill=col)
                d.ellipse((xx-25,yy+3,xx,yy+26),fill=col)
                d.ellipse((xx,yy+3,xx+25,yy+26),fill=col)
                d.line((xx,yy-22,xx,yy+22),fill=INK,width=4)
    else:
        for k in range(5):
            star(d,x-170+k*85,y-20+20*math.sin(t+k),27,list(COLORS.values())[k])


def make_frame(scene, hero, seconds_in_scene, global_time, seed):
    rng = random.Random(seed)
    im = Image.new("RGB", (WIDTH,HEIGHT), (215,241,251))
    d = ImageDraw.Draw(im)
    sky = (192,232,251) if seed%2 == 0 else (208,229,255)
    d.rectangle((0,0,WIDTH,380),fill=sky)
    ellipse(d,830,84,47,(255,226,115))
    for i in range(4):
        x=(i*285+35+global_time*5)%(WIDTH+160)-80
        d.ellipse((x,77+i%2*42,x+130,120+i%2*42),fill=(246,253,255))
    d.ellipse((-120,321,540,630),fill=(149,211,166))
    d.ellipse((380,324,1120,650),fill=(137,205,157))
    d.rectangle((0,403,WIDTH,HEIGHT),fill=(147,214,168))
    for i in range(11):
        x=28+i*92
        y=413+i%3*13
        ellipse(d,x,y,8,(254,161,196))
        ellipse(d,x,y,3,(255,229,108))
    character(d,hero,210,293,global_time,(254,178,122) if 'Bunny' in hero else (170,154,226) if 'Kitten' in hero else (239,191,133))
    title = scene.headline
    centered(d,600,46,title,34 if len(title)>16 else 39)
    scene_object(d,scene,global_time,rng)
    # Caption is verbatim voice text, kept within safe margins.
    d.rounded_rectangle((24,440,936,529),radius=21,fill=(255,255,255),outline=(247,201,129),width=4)
    caption_lines=textwrap.wrap(scene.speech,width=58,break_long_words=False)[:2]
    for k,line in enumerate(caption_lines):
        centered(d,480,468+k*36,line,22)
    d.text((25,15),'LITTLE WONDER LAB',font=font(15),fill=(72,94,117))
    return im



def make_short_frame(scene, hero, seconds_in_scene, global_time, seed):
    """Native portrait framing. Re-layout the scene instead of cropping a landscape image."""
    w, h = 720, 1280
    im = Image.new("RGB", (w, h), (213, 238, 252))
    d = ImageDraw.Draw(im)
    sky = (195, 234, 255) if seed % 2 == 0 else (221, 231, 255)
    d.rectangle((0, 0, w, 1050), fill=sky)
    ellipse(d, 575, 170, 72, (255, 224, 106))
    for i in range(4):
        x = ((i * 240 + global_time * 7) % 1000) - 90
        yy = 258 + (i % 2) * 106
        d.ellipse((x, yy, x + 144, yy + 41), fill=(250, 254, 255))
    d.ellipse((-320, 845, 420, 1300), fill=(159, 210, 177))
    d.ellipse((280, 885, 1040, 1420), fill=(144, 203, 166))
    d.rectangle((0, 1007, w, h), fill=(156, 216, 171))
    for i in range(10):
        x = 27 + i * 76
        y = 1004 + i % 3 * 20
        ellipse(d, x, y, 7, (255, 171, 203))
        ellipse(d, x, y, 3, (255, 223, 106))
    # Titles stay in the upper third of the screen.
    d.rounded_rectangle((65, 35, 593, 101), radius=30, fill=(255, 255, 255))
    centered(d, 328, 66, "LITTLE WONDER LAB", 28)
    title_lines = textwrap.wrap(scene.headline, width=17, break_long_words=False)[:2]
    for i, line in enumerate(title_lines):
        centered(d, 320, 158 + i*60, line, 42 if len(line) <= 15 else 35)
    # Main animation fills the center of a 9:16 screen, never letterboxed.
    color = ((254, 178, 122) if 'Bunny' in hero else
             (170, 154, 226) if 'Kitten' in hero else (239, 191, 133))
    character(d, hero, 322, 479, global_time, color)
    scene_object(d, scene, global_time, random.Random(seed), cx=323, cy=815)
    # Keep important words clear of Shorts' right-hand like/comment buttons.
    d.rounded_rectangle((35, 1060, 613, 1260), radius=28,
                        fill=(255, 255, 255), outline=(248, 196, 132), width=5)
    lines = textwrap.wrap(scene.speech, width=32, break_long_words=False)[:4]
    for i, line in enumerate(lines):
        centered(d, 325, 1101 + i * 43, line, 27)
    return im


def render_video(scenes, hero, wav, path, fps, video_format, seed):
    dims = (720, 1280) if video_format == 'shorts' else (WIDTH, HEIGHT)
    args=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24',
          '-s',f'{dims[0]}x{dims[1]}','-r',str(fps),'-i','-','-i',str(wav),
          '-c:v','libx264','-preset','veryfast','-crf','26','-pix_fmt','yuv420p',
          '-c:a','aac','-b:a','128k','-shortest','-movflags','+faststart',str(path)]
    proc=subprocess.Popen(args,stdin=subprocess.PIPE)
    t=0.0
    try:
        for scene in scenes:
            for k in range(round(scene.seconds*fps)):
                frame=(make_short_frame(scene,hero,k/fps,t+k/fps,seed) if video_format=='shorts'
                       else make_frame(scene,hero,k/fps,t+k/fps,seed))
                proc.stdin.write(frame.tobytes())
            t+=scene.seconds
    except BrokenPipeError as e:
        raise RuntimeError('FFmpeg unexpectedly stopped') from e
    finally:
        proc.stdin.close()
        proc.wait()
    if proc.returncode:
        raise RuntimeError(f'FFmpeg failed with code {proc.returncode}')


def generate(args):
    if not shutil.which('ffmpeg'):
        raise RuntimeError('FFmpeg required in PATH')
    seed=args.seed if args.seed is not None else random.SystemRandom().randint(1,2**31-1)
    topic=random.Random(seed).choice(TOPICS) if args.topic=='random' else args.topic
    hero, land, subtitle, scenes=create_story(topic,seed)
    out=Path(args.output)
    out.mkdir(parents=True,exist_ok=True)
    voice_dir=out/'speech'
    voice_dir.mkdir(exist_ok=True)
    for idx, scene in enumerate(scenes):
        spoken_time=0
        if not args.no_voice:
            clip=voice_dir/f'{idx:02d}.wav'
            spoken_time=make_narration(scene.speech,clip)
            scene.narration_path=str(clip)
        scene.seconds=max(5.0, math.ceil(spoken_time+0.85))
    if args.format == 'shorts' and sum(s.seconds for s in scenes) > 179:
        raise RuntimeError('Shorts episodes must not exceed three minutes')
    music_and_voice(scenes,out/'audio.wav',seed)
    render_video(scenes,hero,out/'audio.wav',out/'episode.mp4',args.fps,args.format,seed)
    cover = (make_short_frame(scenes[1],hero,0,0,seed) if args.format == 'shorts'
             else make_frame(scenes[1],hero,0,0,seed).resize((1280,720),Image.Resampling.LANCZOS))
    cover.save(out/'thumbnail.jpg',quality=93)
    meta={
        'title':f'{subtitle} | {hero} #Shorts' if args.format=='shorts' else f'{subtitle} | {hero} | Little Wonder Lab',
        'description':f'Join {hero} on an original preschool learning adventure in {land}. Today we explore {topic}! Includes narrated learning, handmade 2D graphics, and original computer-generated music. Designed for young children. #PreschoolLearning #KidsCartoons' + (' #Shorts' if args.format=='shorts' else ''),
        'tags':['preschool','learning for kids',topic,'Little Wonder Lab','animated animals'] + (['Shorts'] if args.format=='shorts' else []),
        'category_id':'27', 'language':'en', 'topic':topic, 'character':hero,
        'seed':seed,'created_utc':datetime.now(timezone.utc).isoformat(),
        'duration_seconds':round(sum(s.seconds for s in scenes),2),
        'video_format':args.format,
        'video_width':720 if args.format=='shorts' else WIDTH,
        'video_height':1280 if args.format=='shorts' else HEIGHT,
        'made_for_kids':True,'original_visuals':True,'original_instrumental':True,
        'voice_engine':'none' if args.no_voice else 'espeak',
        'scenes':[{'headline':s.headline,'speech':s.speech,'seconds':s.seconds} for s in scenes],
        'publishing_note':'Human review strongly recommended before making public; templated content may not meet YouTube monetization policy.'
    }
    (out/'metadata.json').write_text(json.dumps(meta,indent=2,ensure_ascii=False),encoding='utf-8')
    (out/'captions.txt').write_text('\n'.join(s.speech for s in scenes),encoding='utf-8')
    print(json.dumps({'ok':True,'output':str(out.resolve()),'topic':topic,'seed':seed,'seconds':meta['duration_seconds']},ensure_ascii=False))
    return meta


def main():
    p=argparse.ArgumentParser(description='Zero-cost original cartoon factory')
    p.add_argument('--topic',choices=TOPICS+('random',),default='random')
    p.add_argument('--seed',type=int)
    p.add_argument('--output',default='build')
    p.add_argument('--fps',type=int,choices=range(8,25),metavar='8..24',default=10)
    p.add_argument('--format',choices=['shorts','landscape'],default='shorts',
                   help='Shorts is vertical 9:16 and the default; landscape retains the old layout')
    p.add_argument('--no-voice',action='store_true')
    generate(p.parse_args())


if __name__=='__main__':
    main()
