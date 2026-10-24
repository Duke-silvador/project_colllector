"""Preserve audited originals; never embed visibly damaged Momonga poses."""
QUARANTINED_MOMONGA = {
    'hang': 'M01: body missing', 'sleep': 'M01: body missing',
    'pout': 'M02: straight face clipping', 'fake-cry': 'M02: straight face clipping',
    'grabbed': 'M03: diagonal body clipping', 'jump': 'M03: diagonal body clipping',
}

def apply_art_quarantine(sprites, profiles):
    """Explicit static idle aliases, not replacement motion or approval."""
    frames=sprites.get('momonga', {})
    if not frames:
        return
    if not frames.get('idle'):
        raise ValueError('Audited safe Momonga idle fallback is required')
    profile=profiles['momonga']
    profile['quarantinedArt']={}
    for frame,reason in QUARANTINED_MOMONGA.items():
        if frame in frames:
            frames[frame]=frames['idle']
            profile['quarantinedArt'][frame]={'fallback':'idle','reason':reason,'audit':'art-audit/character_art_audit.ko.json'}
    profile.setdefault('poseAliases',{}).update({frame:'idle' for frame in profile['quarantinedArt']})
