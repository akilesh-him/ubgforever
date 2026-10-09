(() => {
  let peer = null;
  let hostPeer = null;
  let isHost = false;
  let roomCode = '';
  let connections = new Map();
  let joined = false;
  let lastSend = 0;

  // Local-only identity: this survives page refreshes on the same browser.
  const STORAGE_NAME = 'ubg_chat_name';
  const STORAGE_ID = 'ubg_chat_user_id';
  const getUserId = () => {
    let id = localStorage.getItem(STORAGE_ID);
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : 'user-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
      localStorage.setItem(STORAGE_ID, id);
    }
    return id;
  };
  const $ = id => document.getElementById(id);
  const cleanName = () => {
    const name = (($('community-chat-name')?.value || localStorage.getItem(STORAGE_NAME) || 'Guest').trim().slice(0, 24));
    return name || 'Guest';
  };
  const saveIdentity = () => {
    const name = cleanName();
    localStorage.setItem(STORAGE_NAME, name);
    getUserId();
    if ($('community-chat-name')) $('community-chat-name').value = name;
    return name;
  };
  const setStatus = text => { const el = $('community-chat-status'); if (el) el.textContent = text; };
  const addSystem = text => {
    const box = $('community-chat-messages'); if (!box) return;
    const el = document.createElement('div');
    el.className = 'community-chat-system';
    el.textContent = text;
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
  };
  const addMessage = (msg, mine = false) => {
    const box = $('community-chat-messages'); if (!box) return;
    const wrap = document.createElement('div');
    wrap.className = 'community-chat-message' + (mine ? ' mine' : '');
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `${msg.name || 'Guest'} • ${new Date(msg.time || Date.now()).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}`;
    const body = document.createElement('div');
    body.className = 'body';
    body.textContent = String(msg.text || '').slice(0, 500);
    wrap.append(meta, body);
    box.appendChild(wrap);
    box.scrollTop = box.scrollHeight;
  };
  const showRoom = code => {
    $('community-chat-setup')?.classList.add('hidden');
    $('community-chat-room-ui')?.classList.remove('hidden');
    if ($('community-chat-room-code')) $('community-chat-room-code').textContent = code;
  };

  // The host acts as the lightweight relay. Any number of connected peers
  // can use the same room (limited by the browser/network, not the UI).
  const sendToAll = msg => connections.forEach(c => {
    if (c && c.open) {
      try { c.send({type:'message', ...msg}); } catch {}
    }
  });
  const sendToAllExcept = (peerId, msg) => connections.forEach((c, id) => {
    if (id !== peerId && c.open) {
      try { c.send({type:'message', ...msg}); } catch {}
    }
  });

  window.openCommunityChat = () => {
    const modal = $('community-chat-modal'); if (!modal) return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    const saved = localStorage.getItem(STORAGE_NAME);
    if (saved && $('community-chat-name')) $('community-chat-name').value = saved;
    getUserId();
    setStatus('Create or join a room to chat.');
    setTimeout(() => $('community-chat-name')?.focus(), 50);
  };

  window.closeCommunityChat = () => {
    const modal = $('community-chat-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
    }
  };

  window.createCommunityRoom = () => {
    if (!window.Peer) { setStatus('The peer connection library could not load.'); return; }
    saveIdentity();
    if (peer) { try { peer.destroy(); } catch {} }

    // The first user is the room host/relay.
    roomCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    isHost = true;
    joined = false;
    peer = new Peer('ubg-' + roomCode, {debug: 0});

    peer.on('open', id => {
      joined = true;
      if ($('community-chat-room')) $('community-chat-room').value = roomCode;
      showRoom(roomCode);
      setStatus('Room is ready. Share the code with as many people as you want.');
      addSystem('You created the room. Keep this tab open while the room is active.');
    });

    peer.on('connection', conn => setupConnection(conn, true));
    peer.on('error', err => {
      if (err?.type === 'unavailable-id') {
        setStatus('That room code was already taken. Creating another…');
        setTimeout(window.createCommunityRoom, 250);
      } else {
        setStatus('Connection error. Try creating a new room.');
      }
    });
  };

  window.joinCommunityRoom = () => {
    if (!window.Peer) { setStatus('The peer connection library could not load.'); return; }
    saveIdentity();
    const code = (($('community-chat-room')?.value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, ''));
    if (code.length < 4) { setStatus('Enter a valid room code.'); return; }

    if (peer) { try { peer.destroy(); } catch {} }
    roomCode = code;
    isHost = false;
    joined = false;
    hostPeer = 'ubg-' + code;
    peer = new Peer(undefined, {debug: 0});

    peer.on('open', () => {
      const conn = peer.connect(hostPeer, {reliable: true});
      setupConnection(conn, false);
    });
    peer.on('error', err => {
      setStatus(err?.type === 'peer-unavailable'
        ? 'Room not found. Check the code and try again.'
        : 'Could not join the room.');
    });
  };

  function setupConnection(conn, hostSide) {
    if (!conn) return;
    connections.set(conn.peer, conn);

    conn.on('open', () => {
      joined = true;
      showRoom(roomCode);
      setStatus(isHost
        ? `${connections.size} user${connections.size === 1 ? '' : 's'} connected.`
        : 'Connected to the room.');

      if (hostSide) {
        try {
          conn.send({type:'welcome', users: connections.size});
        } catch {}
        addSystem('Someone joined the room.');
      } else {
        addSystem('Connected. Messages are sent directly between browsers.');
      }
    });

    conn.on('data', data => {
      if (!data || typeof data !== 'object') return;

      if (data.type === 'message') {
        // Show once on the receiving browser.
        addMessage(data, false);

        // Host relays it to every other participant.
        if (isHost) sendToAllExcept(conn.peer, data);
      }
    });

    conn.on('close', () => {
      connections.delete(conn.peer);
      if (isHost) {
        setStatus(`${connections.size} user${connections.size === 1 ? '' : 's'} connected.`);
        addSystem('Someone left the room.');
      }
    });

    conn.on('error', () => {
      connections.delete(conn.peer);
    });
  }

  window.sendCommunityMessage = e => {
    e.preventDefault();
    if (!joined) { setStatus('Join a room first.'); return; }

    const input = $('community-chat-input');
    const text = (input?.value || '').trim();
    if (!text) return;

    const now = Date.now();
    if (now - lastSend < 700) { setStatus('Slow down a little.'); return; }
    lastSend = now;

    const name = saveIdentity();
    const msg = {
      type: 'message',
      userId: getUserId(),
      name,
      text: text.slice(0, 500),
      time: now
    };

    addMessage(msg, true);

    if (isHost) {
      sendToAll(msg);
    } else {
      // Non-hosts have one connection: the host.
      connections.forEach(c => {
        if (c.open) {
          try { c.send(msg); } catch {}
        }
      });
    }

    input.value = '';
    input.focus();
  };

  window.copyCommunityRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setStatus('Room code copied.');
    } catch {
      setStatus(`Room code: ${roomCode}`);
    }
  };

  window.leaveCommunityRoom = () => {
    connections.forEach(c => { try { c.close(); } catch {} });
    connections.clear();
    if (peer) { try { peer.destroy(); } catch {} }
    peer = null;
    joined = false;
    isHost = false;
    roomCode = '';
    $('community-chat-room-ui')?.classList.add('hidden');
    $('community-chat-setup')?.classList.remove('hidden');
    if ($('community-chat-messages')) $('community-chat-messages').innerHTML = '';
    setStatus('You left the room.');
  };

  // Make sure the saved nickname is restored whenever the chat UI exists.
  document.addEventListener('DOMContentLoaded', () => {
    getUserId();
    const saved = localStorage.getItem(STORAGE_NAME);
    if (saved && $('community-chat-name')) $('community-chat-name').value = saved;
  });
})();
