"""Cuts a stretch out of an MP3 without re-encoding it: keeps the whole frames
between two times. Used for the opening words of the adhan recordings.

    python tools/cut-mp3.py <in.mp3> <out.mp3> <from seconds> <to seconds>

The cut points should fall in a pause, since nothing is faded. Any ID3 tag
and the Xing/Info header frame are left out, so players measure the new file
by its frames. Standard library only.
"""
import sys

BITRATES = {
    1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],  # MPEG-1 layer III
    2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],  # MPEG-2 and 2.5 layer III
}
RATES = {3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000]}


def header(data, at):
    """The frame that starts at this byte: (bytes long, seconds long), or None."""
    if at + 4 > len(data) or data[at] != 0xFF or data[at + 1] & 0xE0 != 0xE0:
        return None
    version = (data[at + 1] >> 3) & 3
    layer = (data[at + 1] >> 1) & 3
    bitrate = data[at + 2] >> 4
    rate = (data[at + 2] >> 2) & 3
    padding = (data[at + 2] >> 1) & 1
    if version == 1 or layer != 1 or bitrate in (0, 15) or rate == 3:
        return None
    hz = RATES[version][rate]
    if version == 3:
        return 144000 * BITRATES[1][bitrate] // hz + padding, 1152 / hz
    return 72000 * BITRATES[2][bitrate] // hz + padding, 576 / hz


def frames(data):
    at = 0
    if data[:3] == b'ID3':
        at = 10 + ((data[6] & 127) << 21 | (data[7] & 127) << 14 | (data[8] & 127) << 7 | (data[9] & 127))
    while at < len(data) - 4:
        found = header(data, at)
        # A real frame is followed by another frame, or by the end of the file.
        if found and (at + found[0] >= len(data) - 4 or header(data, at + found[0])):
            yield at, found[0], found[1]
            at += found[0]
        else:
            at += 1


def cut(source, target, start, end):
    data = open(source, 'rb').read()
    out = bytearray()
    clock = 0.0
    kept = 0
    for at, size, seconds in frames(data):
        frame = data[at:at + size]
        if clock == 0.0 and (b'Xing' in frame[:64] or b'Info' in frame[:64]):
            continue  # the header frame that describes the whole original file
        if start <= clock < end:
            out += frame
            kept += 1
        clock += seconds
    open(target, 'wb').write(bytes(out))
    return kept, clock


if __name__ == '__main__':
    kept, total = cut(sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]))
    print('%s: %d frames kept of %.1f s' % (sys.argv[2], kept, total))
