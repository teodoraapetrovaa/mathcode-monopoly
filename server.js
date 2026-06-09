const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

const BOARD = [
  {name:"СТАРТ",type:"corner",pos:0},
  {name:"Копирен и дигитален център",type:"prop",color:"brown",price:60,rent:[2,10,30,90,160,250],pos:1},
  {name:"Обща каса",type:"chest",pos:2},
  {name:"Сервиз за компютри и телефони",type:"prop",color:"brown",price:60,rent:[4,20,60,180,320,450],pos:3},
  {name:"Хакатон",type:"tax",fee:100,pos:4},
  {name:"5G Мобилна мрежа",type:"railroad",price:200,pos:5},
  {name:"Content Creation Студио",type:"prop",color:"lightblue",price:100,rent:[6,30,90,270,400,550],pos:6},
  {name:"Шанс",type:"chance",pos:7},
  {name:"Онлайн магазин за дрехи",type:"prop",color:"lightblue",price:100,rent:[6,30,90,270,400,550],pos:8},
  {name:"Уебсайт за е-спортове",type:"prop",color:"lightblue",price:120,rent:[8,40,100,300,450,600],pos:9},
  {name:"ИТ ПОДДРЪЖКА",type:"corner",pos:10},
  {name:"Стрийминг платформа за музика",type:"prop",color:"pink",price:140,rent:[10,50,150,450,625,750],pos:11},
  {name:"Киберсигурност & Хакери",type:"utility",price:150,pos:12},
  {name:"Агенция за дигитална реклама",type:"prop",color:"pink",price:140,rent:[10,50,150,450,625,750],pos:13},
  {name:"Платформа за доставка на храна",type:"prop",color:"pink",price:160,rent:[12,60,180,500,700,900],pos:14},
  {name:"Оптична интернет магистрала",type:"railroad",price:200,pos:15},
  {name:"Платформа за онлайн курсове",type:"prop",color:"orange",price:180,rent:[14,70,200,550,750,950],pos:16},
  {name:"Обща каса",type:"chest",pos:17},
  {name:"Студио за уеб дизайн",type:"prop",color:"orange",price:180,rent:[14,70,200,550,750,950],pos:18},
  {name:"Фирма за мобилни приложения",type:"prop",color:"orange",price:200,rent:[16,80,220,600,800,1000],pos:19},
  {name:"CHILL ZONE",type:"corner",pos:20},
  {name:"Интернет доставчик (ISP)",type:"prop",color:"red",price:220,rent:[18,90,250,700,875,1050],pos:21},
  {name:"Шанс",type:"chance",pos:22},
  {name:"Фабрика за асемблиране на компютри",type:"prop",color:"red",price:220,rent:[18,90,250,700,875,1050],pos:23},
  {name:"Сървърен център (Data Center)",type:"prop",color:"red",price:240,rent:[20,100,300,750,925,1100],pos:24},
  {name:"Сателитна мрежа",type:"railroad",price:200,pos:25},
  {name:"Компания за анализ на данни",type:"prop",color:"yellow",price:260,rent:[22,110,330,800,975,1150],pos:26},
  {name:"AI Стартъп",type:"prop",color:"yellow",price:260,rent:[22,110,330,800,975,1150],pos:27},
  {name:"Облачни услуги & Сървър",type:"utility",price:150,pos:28},
  {name:"Облачна платформа (Cloud)",type:"prop",color:"yellow",price:280,rent:[24,120,360,850,1025,1200],pos:29},
  {name:"СРИВ В СИСТЕМАТА",type:"corner",pos:30},
  {name:"Компания за киберсигурност",type:"prop",color:"green",price:300,rent:[26,130,390,900,1100,1275],pos:31},
  {name:"Финтех стартъп",type:"prop",color:"green",price:300,rent:[26,130,390,900,1100,1275],pos:32},
  {name:"Обща каса",type:"chest",pos:33},
  {name:"Блокчейн платформа",type:"prop",color:"green",price:320,rent:[28,150,450,1000,1200,1400],pos:34},
  {name:"Подводен океански кабел",type:"railroad",price:200,pos:35},
  {name:"Шанс",type:"chance",pos:36},
  {name:"Технологичен гигант (Big Tech)",type:"prop",color:"darkblue",price:350,rent:[35,175,500,1100,1300,1500],pos:37},
  {name:"Крипто мина",type:"tax",fee:-100,pos:38},
  {name:"SpaceTech Компания",type:"prop",color:"darkblue",price:400,rent:[50,200,600,1400,1700,2000],pos:39},
];

const BOT_NAMES = ['🤖 Бот Алфа','🤖 Бот Бета','🤖 Бот Гама'];

function createInitialState(humanPlayers, botCount) {
  const allNames = [...humanPlayers];
  for (let i = 0; i < botCount; i++) allNames.push(BOT_NAMES[i]);
  return {
    players: allNames.map((name, i) => ({
      id: i, name,
      money: 1500, pos: 0, props: [], bankrupt: false, jailed: false,
      color: ['#e53935','#1565c0','#2e7d32','#f57f17'][i],
      emoji: ['🔴','🔵','🟢','🟡'][i],
      isBot: i >= humanPlayers.length
    })),
    current: 0, phase: 'roll',
    lastRoll: [null, null],
    log: ['🚀 Играта започна! 1500 MC на всеки!'],
    started: true
  };
}

function processCell(state, pl, d1, d2) {
  const cell = BOARD[pl.pos];
  if (cell.type === 'prop' || cell.type === 'railroad' || cell.type === 'utility') {
    const owner = state.players.find(p => p.props.includes(cell.pos));
    if (!owner) {
      if (pl.money >= cell.price) return 'buy';
      state.log.unshift(`${pl.name} няма достатъчно MC`); return 'next';
    } else if (owner.id !== pl.id) {
      let rent = 0;
      if (cell.type === 'prop') rent = cell.rent[0];
      else if (cell.type === 'railroad') { const o = owner.props.filter(p => BOARD[p] && BOARD[p].type === 'railroad').length; rent = 25 * Math.pow(2, o - 1); }
      else { const dice = d1 + d2; const numC = Math.max(pl.props.length, 1); const ownsBoth = owner.props.includes(12) && owner.props.includes(28); rent = Math.round(dice * Math.pow(numC, 2)); if (ownsBoth) rent *= 2; }
      rent = Math.min(rent, pl.money);
      pl.money -= rent; owner.money += rent;
      state.log.unshift(`💸 ${pl.name} плати ${rent} MC на ${owner.name}`);
      if (pl.money <= 0) { pl.bankrupt = true; pl.money = 0; state.log.unshift(`💀 ${pl.name} е ФАЛИРАЛ!`); }
      return 'next';
    } else { state.log.unshift(`${pl.name} кацна на свой бизнес`); return 'next'; }
  } else if (cell.type === 'tax') {
    if (cell.fee < 0) { pl.money += (-cell.fee); state.log.unshift(`⛏️ ${pl.name} спечели ${-cell.fee} MC от Крипто мина!`); }
    else { const fee = Math.min(cell.fee, pl.money); pl.money -= fee; state.log.unshift(`🏆 ${pl.name} плати Хакатон ${fee} MC`); }
    return 'next';
  } else if (cell.type === 'chance' || cell.type === 'chest') {
    const cards = [{txt:'💡 Стартъп идея! +150 MC',val:150},{txt:'🐛 Бъг в кода! -100 MC',val:-100},{txt:'📈 Инвеститор! +200 MC',val:200},{txt:'🔒 Кибератака! -150 MC',val:-150},{txt:'🎓 Спечели хакатон! +100 MC',val:100},{txt:'💾 Срив на сървъра! -50 MC',val:-50},{txt:'🚀 Вирусен продукт! +50 MC',val:50},{txt:'📱 Вирусна публикация! +100 MC',val:100},{txt:'⚡ Хардуерна авария! -100 MC',val:-100},{txt:'🌐 Домейнът изтече! -50 MC',val:-50}];
    const card = cards[Math.floor(Math.random() * cards.length)];
    if (card.val > 0) pl.money += card.val; else { const l = Math.min(-card.val, pl.money); pl.money -= l; }
    state.log.unshift(`🃏 ${pl.name}: ${card.txt}`);
    return 'next';
  } else if (cell.type === 'corner') {
    if (cell.pos === 30) { pl.pos = 10; state.log.unshift(`💥 ${pl.name} — СРИВ В СИСТЕМАТА! В ИТ Поддръжка.`); }
    return 'next';
  }
  return 'next';
}

function endTurn(state) {
  let next = (state.current + 1) % state.players.length, tries = 0;
  while (state.players[next].bankrupt && tries < state.players.length) { next = (next + 1) % state.players.length; tries++; }
  state.current = next; state.phase = 'roll';
}

function checkWinner(state) {
  const alive = state.players.filter(p => !p.bankrupt);
  return alive.length === 1 ? alive[0] : null;
}

function doBotTurn(roomCode) {
  const room = rooms[roomCode];
  if (!room || !room.state) return;
  const state = room.state;
  const pl = state.players[state.current];
  if (!pl || !pl.isBot || pl.bankrupt) return;

  // Roll
  const d1 = Math.ceil(Math.random() * 6), d2 = Math.ceil(Math.random() * 6);
  state.lastRoll = [d1, d2];
  const steps = d1 + d2;
  const oldPos = pl.pos;
  state.log.unshift(`🎲 ${pl.name} хвърли ${d1}+${d2}=${steps}`);
  pl.pos = (pl.pos + steps) % 40;
  if (pl.pos < oldPos) { pl.money += 200; state.log.unshift(`🏁 ${pl.name} мина СТАРТ — +200 MC!`); }

  const result = processCell(state, pl, d1, d2);
  if (result === 'buy') {
    const cell = BOARD[pl.pos];
    // Bot buys if it has enough money (simple AI)
    if (pl.money >= cell.price && pl.money > cell.price * 1.2) {
      pl.money -= cell.price; pl.props.push(cell.pos);
      state.log.unshift(`🤖 ${pl.name} купи "${cell.name}" за ${cell.price} MC`);
    } else {
      state.log.unshift(`🤖 ${pl.name} реши да не купува`);
    }
  }

  const winner = checkWinner(state);
  endTurn(state);
  io.to(roomCode).emit('state_update', state);

  // If next player is also a bot, schedule another bot turn
  if (!winner) {
    const next = state.players[state.current];
    if (next && next.isBot && !next.bankrupt) {
      setTimeout(() => doBotTurn(roomCode), 1800);
    }
  }
}

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on('join_room', ({ roomCode, playerName }) => {
    if (!rooms[roomCode]) {
      rooms[roomCode] = { players: [], state: null, sockets: {} };
    }
    const room = rooms[roomCode];
    if (room.state && room.state.started) { socket.emit('error_msg', 'Играта вече е започнала!'); return; }
    if (room.players.length >= 4) { socket.emit('error_msg', 'Стаята е пълна (макс. 4 играчи)!'); return; }

    room.players.push({ name: playerName, socketId: socket.id });
    room.sockets[socket.id] = room.players.length - 1;
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.playerIndex = room.players.length - 1;

    io.to(roomCode).emit('lobby_update', {
      players: room.players.map(p => p.name),
      count: room.players.length
    });
    console.log(`${playerName} joined room ${roomCode}`);
  });

  socket.on('start_game', ({ roomCode, botCount }) => {
    const room = rooms[roomCode];
    if (!room) return;
    // FIX: check by socketId, not playerIndex
    const isHost = room.players.length > 0 && room.players[0].socketId === socket.id;
    if (!isHost) { socket.emit('error_msg', 'Само домакинът може да започне играта!'); return; }

    const bots = Math.max(0, Math.min(botCount || 0, 4 - room.players.length));
    room.state = createInitialState(room.players.map(p => p.name), bots);
    io.to(roomCode).emit('game_started', room.state);

    // If first player is a bot (shouldn't happen), kick off bot
    const first = room.state.players[0];
    if (first && first.isBot) setTimeout(() => doBotTurn(roomCode), 2000);
  });

  socket.on('roll_dice', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || !room.state) return;
    const state = room.state;
    const pIdx = socket.data.playerIndex;
    if (pIdx !== state.current || state.phase !== 'roll') return;

    const d1 = Math.ceil(Math.random() * 6), d2 = Math.ceil(Math.random() * 6);
    state.lastRoll = [d1, d2];
    const steps = d1 + d2;
    const pl = state.players[state.current];
    const oldPos = pl.pos;
    state.log.unshift(`🎲 ${pl.name} хвърли ${d1}+${d2}=${steps}`);
    pl.pos = (pl.pos + steps) % 40;
    if (pl.pos < oldPos) { pl.money += 200; state.log.unshift(`🏁 ${pl.name} мина СТАРТ — +200 MC!`); }

    const result = processCell(state, pl, d1, d2);
    if (result === 'buy') { state.phase = 'buy'; }
    else { endTurn(state); }
    io.to(roomCode).emit('state_update', state);

    // Check if next is bot
    if (result !== 'buy') {
      const next = state.players[state.current];
      if (next && next.isBot && !next.bankrupt) setTimeout(() => doBotTurn(roomCode), 1800);
    }
  });

  socket.on('buy_property', ({ roomCode, buy }) => {
    const room = rooms[roomCode];
    if (!room || !room.state) return;
    const state = room.state;
    if (socket.data.playerIndex !== state.current) return;

    const pl = state.players[state.current];
    const cell = BOARD[pl.pos];
    if (buy && pl.money >= cell.price) {
      pl.money -= cell.price; pl.props.push(cell.pos);
      state.log.unshift(`🏢 ${pl.name} купи "${cell.name}" за ${cell.price} MC`);
    } else {
      state.log.unshift(`${pl.name} отказа да купи ${cell.name}`);
    }
    endTurn(state);
    io.to(roomCode).emit('state_update', state);

    const next = state.players[state.current];
    if (next && next.isBot && !next.bankrupt) setTimeout(() => doBotTurn(roomCode), 1800);
  });

  socket.on('disconnect', () => {
    const roomCode = socket.data.roomCode;
    if (roomCode && rooms[roomCode]) {
      const room = rooms[roomCode];
      room.players = room.players.filter(p => p.socketId !== socket.id);
      if (room.players.length === 0) delete rooms[roomCode];
      else io.to(roomCode).emit('lobby_update', { players: room.players.map(p => p.name), count: room.players.length });
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
