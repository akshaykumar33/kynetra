# Knovra Office

A virtual office for remote and hybrid teams. Everyone shares one 3D floor: you see who is in,
walk up to someone to talk, knock on a meeting room, and grab coffee in the lounge.

This is the phase 1 prototype. Colleagues, presence and voice are simulated.

## Run it

```sh
npm install
npm run dev
```

Open the printed local URL. Move with W A S D (or the arrow keys), or click the floor. Drag to look around.

## Try this

- Walk up to Lena or Arjun at the Design pod: a conversation opens, and closes when you walk away.
- Walk up to Mei (focusing): you can leave a note instead of interrupting.
- Stand at the Harbour room door and knock.
- Click anyone in the people list to walk over to them.
- Set yourself to Focusing or Away.

## Roadmap

1. Floor prototype (this)
2. Real-time presence (WebSocket rooms) and proximity voice/video (WebRTC via LiveKit)
3. Admin office designer: drag-and-drop layout within the rented floor area
4. Hybrid bridge: in-office check-in and an office display of the virtual floor
5. Campus, building and city map as the outer layer

The previous Knovra codebase is archived at tag `archive/knovra-v1`.
