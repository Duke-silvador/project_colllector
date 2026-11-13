"""Reproduce the static comparison. Requires numpy, scipy, Pillow.
Run in this directory: python build-comparison.py
Source: Massen Esmaeili headshot, prepared as a square 256px grayscale image.
"""
from pathlib import Path
import hashlib, json, itertools, math
import numpy as np
import scipy, PIL
from PIL import Image
from scipy.linalg import svd

ROOT = Path(__file__).resolve().parent
SIZE = 256
CHIS = [30, 28, 20, 16, 12, 10, 8, 6, 4, 2, 1]
SOURCE = ROOT / 'headshot.png'

def tensorize(a):
    q = int(np.log2(a.shape[0]))
    assert a.shape == (2**q, 2**q)
    permutation = [j for k in range(q) for j in (k, q+k)]
    return a.reshape([2]*(2*q)).transpose(permutation), permutation


def matched_profile(chi, floor=None):
 n=16;base=[1]+[min(chi,2**k,2**(n-k)) for k in range(1,n)]+[1]
 if floor:base=[max(a,b) for a,b in zip(base,floor)]
 count=lambda a:sum(2*l*r for l,r in zip(a[:-1],a[1:]))
 target=512*math.ceil(count(base)/512)
 if count(base)==target:return base,target
 for radius in [4,8,16]:
  best=None
  for i,j in itertools.combinations(range(2,n-1),2):
   for a in range(max(1, floor[i] if floor else 1,base[i]-radius),min(2**i,2**(n-i),chi+radius)+1):
    for b in range(max(1, floor[j] if floor else 1,base[j]-radius),min(2**j,2**(n-j),chi+radius)+1):
     trial=base.copy();trial[i]=a;trial[j]=b
     if count(trial)!=target:continue
     if any(trial[k]>2*trial[k-1] or trial[k-1]>2*trial[k] for k in range(1,n+1)):continue
     score=(a-base[i])**2+(b-base[j])**2
     if best is None or score<best[0]:best=(score,trial)
  if best:return best[1],target
 return None,target


def tt_svd(a, chi, profile=None):
    t, permutation = tensorize(a)
    n = t.ndim
    remaining, left, cores = t, 1, []
    for k in range(n-1):
        u, s, vh = svd(remaining.reshape(left*2, -1), full_matrices=False, check_finite=False)
        r = profile[k+1] if profile is not None else min(chi, len(s))
        assert r <= len(s)
        cores.append(u[:, :r].reshape(left, 2, r))
        remaining, left = s[:r, None]*vh[:r], r
    cores.append(remaining.reshape(left, 2, 1))
    reconstructed = cores[0]
    for core in cores[1:]:
        reconstructed = np.tensordot(reconstructed, core, axes=(-1, 0))
    reconstructed = reconstructed.reshape([2]*n).transpose(np.argsort(permutation)).reshape(a.shape)
    bonds = [1] + [c.shape[2] for c in cores]
    stored = sum(c.size for c in cores)
    assert stored == sum(2*l*r for l,r in zip(bonds[:-1], bonds[1:]))
    assert bonds == (profile if profile is not None else [1]+[min(chi, 2**k, 2**(n-k)) for k in range(1,n)]+[1])
    return reconstructed, stored, bonds

def metric(reference, reconstructed, stored):
    dot = np.vdot(reference, reconstructed).real
    norm2 = np.vdot(reference, reference).real
    den = norm2*np.vdot(reconstructed, reconstructed).real
    return {'stored': int(stored), 'cr': reference.size/stored,
            'relativeError': float(np.linalg.norm(reference-reconstructed)/np.sqrt(norm2)),
            'infidelity': float(max(0, 1-dot*dot/den))}

def grayscale(a):
    # Identical display scale for every original/reconstruction, with no rescaling.
    return Image.fromarray(np.round(np.clip(a, 0, 1)*255).astype('uint8'), 'L').convert('RGB')

def error_rgb(a, maximum):
    stops = np.array([[244,240,248],[170,133,186],[95,46,111],[209,96,67],[252,220,102]])
    x=np.clip(a/maximum,0,1)*4
    lo=np.minimum(x.astype(int),3); frac=x-lo
    rgb=stops[lo]*(1-frac[...,None])+stops[lo+1]*frac[...,None]
    return Image.fromarray(np.round(rgb).astype('uint8'),'RGB')

def main():
    a = np.asarray(Image.open(SOURCE).convert('L'), dtype=np.float64)/255
    assert a.shape == (SIZE,SIZE)
    u,s,vh=svd(a, full_matrices=False, check_finite=False)
    exact,_,exact_bonds=tt_svd(a,SIZE)
    assert np.linalg.norm(a-exact)/np.linalg.norm(a)<1e-12
    frames=[{'mode':'reference','label':'Full-resolution Massen',
             'storage':{'stored':a.size,'cr':1.0},'bonds':exact_bonds,
             'mps':None,'svd':None}]
    arrays=[a]
    # Preserve exact equal SVD/MPS storage budgets where a matrix SVD is feasible.
    profiles={};floor=None
    for chi in sorted(c for c in CHIS if c>=4):
        ranks,budget=matched_profile(chi,floor)
        assert ranks is not None
        profiles[chi]=ranks;floor=ranks
    previous=exact_bonds
    previous_error=0.0
    for chi in CHIS:
        m,stored,bonds=tt_svd(a,chi,profiles.get(chi))
        assert all(x>=y for x,y in zip(previous,bonds))
        previous=bonds
        tm=metric(a,m,stored)
        assert tm['relativeError']+1e-12>=previous_error
        previous_error=tm['relativeError']
        sm=None
        if stored % (2*SIZE)==0:
            r=stored//(2*SIZE)
            z=(u[:,:r]*s[:r])@vh[:r]
            sm=metric(a,z,stored)
            assert sm['cr']==tm['cr']
            assert abs(sm['relativeError']-np.linalg.norm(s[r:])/np.linalg.norm(a))<1e-12
        frames.append({'mode':'mps','label':'Abstract-art Massen' if chi<=4 else 'Recognizable Massen',
                       'storage':{'stored':stored,'cr':tm['cr']},'chi':max(bonds),
                       'nominalBond':chi,'bonds':bonds,'mps':tm,'svd':sm})
        arrays.append(m)
    assert all(y['storage']['cr']>x['storage']['cr'] for x,y in zip(frames[:-1],frames[1:]))
    atlas=Image.new('RGB',(2*SIZE,(1+len(frames))*SIZE),(244,240,248))
    atlas.paste(grayscale(a),(0,0))
    for i,m in enumerate(arrays):atlas.paste(grayscale(m),(SIZE,(1+i)*SIZE))
    atlas.save(ROOT/'compression-atlas.png',optimize=True)
    result={'versions':{'numpy':np.__version__,'scipy':scipy.__version__,'Pillow':PIL.__version__},
            'size':SIZE,'sites':16,'precision':'float64','defaultIndex':7,
            'source':'headshot.png','sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
            'frames':frames}
    (ROOT/'compression-data.js').write_text('window.COMPRESSION_DATA = '+json.dumps(result,separators=(',',':'))+';\n')
    for f in frames:
        error=f['mps']['relativeError'] if f['mps'] else 0
        print(f"{f['label']}: CR={f['storage']['cr']:.2f}, error={error:.5f}, SVD matched={f['svd'] is not None}")
    print('PASS: exact full reconstruction; nested ranks; increasing CR/error; exact matched SVD storage when feasible.')

if __name__=='__main__':main()
