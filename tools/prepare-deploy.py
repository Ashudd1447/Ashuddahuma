"""Run before every deploy:

    python tools/prepare-deploy.py

1. Stamps the version: CACHE in public/sw.js becomes the time of this deploy,
   ashudd-YYYY-MM-DDTHH:MMZ (UTC). That makes every device fetch the new
   offline copy, and the home page shows the version as a date and a time in
   the device's own time zone (the father asked for a date, not a number).
2. Sizes the offline copy: every file in FILES, which each device saves to
   work in airplane mode. The father asked (2026-11-24) to be reminded when it
   passes 300 MB, so he can choose what becomes online only.

Lists the largest kinds of file and any FILES entry missing on disk (then
exits with 1). Standard library only."""
import datetime
import os
import re
import sys

LIMIT_MB = 300
HERE = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(HERE, '..', 'public')
SW = os.path.join(PUBLIC, 'sw.js')


def stamp():
    with open(SW, encoding='utf-8') as f:
        text = f.read()
    now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ')
    text, count = re.subn(r"^const CACHE = '[^']*';", f"const CACHE = 'ashudd-{now}';", text, count=1, flags=re.M)
    if not count:
        sys.exit('No "const CACHE = ..." line in public/sw.js')
    with open(SW, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    print(f'Version: ashudd-{now}')
    return text


def size(text):
    files = re.findall(r"^  '(/[^']*)',$", text, re.M)
    total = 0
    kinds = {}
    missing = []
    for name in files:
        path = os.path.join(PUBLIC, 'index.html' if name == '/' else name.lstrip('/'))
        if not os.path.exists(path):
            missing.append(name)
            continue
        bytes_ = os.path.getsize(path)
        total += bytes_
        kind = name.rsplit('.', 1)[-1] if '.' in name.rsplit('/', 1)[-1] else 'page'
        kinds[kind] = kinds.get(kind, 0) + bytes_
    mb = total / 1e6
    print(f'Offline copy: {len(files)} files, {mb:.1f} MB (limit to revisit: {LIMIT_MB} MB)')
    for kind, bytes_ in sorted(kinds.items(), key=lambda item: -item[1])[:6]:
        print(f'  .{kind}: {bytes_ / 1e6:.1f} MB')
    if missing:
        print('Listed in FILES but missing on disk:', ', '.join(missing))
    if mb > LIMIT_MB:
        print(f'REMINDER: the offline copy is over {LIMIT_MB} MB. Ask the father which content should be online only.')
    return 1 if missing else 0


if __name__ == '__main__':
    sys.exit(size(stamp()))
