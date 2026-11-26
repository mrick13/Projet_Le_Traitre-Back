const { Partie } = require('../models');

// État de jeu en mémoire : gameStates[partyId] = {
//   phase, dayNumber, players, masterSocketId,
//   night: { wolfVotes, wolfTargetId, witchKillTargetId, witchHealedTonight },
//   witchPotions: { healUsed, killUsed },
//   votes: { voterUserId: targetUserId },
//   voteRunoff: { candidateIds } | null
// }
const gameStates = {};

function createEmptyNight() {
    return { wolfVotes: {}, wolfTargetId: null, witchKillTargetId: null, witchHealedTonight: false };
}

function createEmptyState(masterSocketId = null) {
    return {
        phase: 'lobby',
        dayNumber: 0,
        players: [],
        masterSocketId,
        night: createEmptyNight(),
        witchPotions: { healUsed: false, killUsed: false },
        votes: {},
        voteRunoff: null
    };
}

// Dépouille un ensemble de votes { votantId: cibleId } et retourne le(s) candidat(s) en tête.
function tally(votesObj) {
    const counts = {};
    Object.values(votesObj).forEach(targetId => {
        counts[targetId] = (counts[targetId] || 0) + 1;
    });

    let maxVotes = 0;
    let topIds = [];
    for (const [id, count] of Object.entries(counts)) {
        const numId = Number(id);
        if (count > maxVotes) {
            maxVotes = count;
            topIds = [numId];
        } else if (count === maxVotes && maxVotes > 0) {
            topIds.push(numId);
        }
    }
    return topIds;
}

function mapPublicPlayers(state) {
    return state.players.map(p => ({ userId: p.userId, pseudo: p.pseudo, alive: p.alive !== false }));
}

function fullRoster(state) {
    return state.players.map(p => ({
        userId: p.userId,
        pseudo: p.pseudo,
        playerRole: p.playerRole,
        alive: p.alive !== false
    }));
}

function broadcastPlayers(io, partyId, state) {
    io.to(`game:${partyId}`).emit('game:players-updated', { players: mapPublicPlayers(state) });
}

// Règle officielle du Loup-Garou de Thiercelieux : le village gagne quand tous les loups
// sont éliminés, les loups gagnent quand il ne reste plus aucun villageois vivant.
// (La règle "à parité, les loups gagnent" est un raccourci de certaines adaptations
// digitales, pas la règle du jeu physique : elle empêchait un dernier villageois avec un
// pouvoir encore disponible — ex. la Sorcière et sa potion de mort — de se battre jusqu'au
// bout. Ici la partie continue tant qu'il reste au moins un joueur de chaque camp.)
function checkWinner(state) {
    const alive = state.players.filter(p => p.alive !== false);
    if (alive.length === 0) return null;

    const wolvesAlive = alive.filter(p => p.playerRole === 'Loup-Garou').length;
    const villageAlive = alive.length - wolvesAlive;

    if (wolvesAlive === 0) return 'village';
    if (villageAlive === 0) return 'loups';
    return null;
}

// Enregistre le résultat de la partie en base pour l'historique des joueurs (best-effort :
// une erreur de sauvegarde ne doit pas empêcher la partie de se terminer côté joueurs).
function persistHistorique(partyId, state, winner) {
    Partie.update(
        { historique: { winner, players: fullRoster(state), endedAt: new Date().toISOString() } },
        { where: { id: partyId } }
    ).catch(err => console.error(`Erreur sauvegarde historique (partie ${partyId}) :`, err.message));
}

function endGameWithWinner(io, partyId, state, winner) {
    state.phase = 'end';
    io.to(`game:${partyId}`).emit('game:over', { winner, players: fullRoster(state) });
    io.to(`game:${partyId}`).emit('phase:changed', {
        phase: state.phase,
        dayNumber: state.dayNumber
    });
    persistHistorique(partyId, state, winner);
}

function registerSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        // Rejoindre une room de jeu
        socket.on('game:join', ({ partyId, userId, pseudo, role, playerRole }) => {
            if (!partyId || !userId) {
                socket.emit('error', { message: 'partyId et userId requis' });
                return;
            }

            socket.join(`game:${partyId}`);
            socket.data = { partyId, userId, pseudo, role, playerRole };

            // Initialiser l'état si c'est le MJ qui crée la room
            if (role === 'master') {
                if (!gameStates[partyId]) {
                    gameStates[partyId] = createEmptyState(socket.id);
                } else {
                    gameStates[partyId].masterSocketId = socket.id;
                }
            }

            // S'assurer que l'état existe (même si un joueur rejoint avant le MJ)
            if (!gameStates[partyId]) {
                gameStates[partyId] = createEmptyState(null);
            }

            const state = gameStates[partyId];

            // Le MJ n'est pas un joueur de la partie : ne pas l'ajouter à la liste des joueurs
            if (role === 'player') {
                // Ajouter le joueur à la liste s'il n'y est pas déjà
                const existingPlayer = state.players.find(p => p.userId === userId);
                if (!existingPlayer) {
                    state.players.push({ userId, pseudo, socketId: socket.id, role, playerRole, alive: true });
                } else {
                    // Reconnexion : mettre à jour le socketId
                    existingPlayer.socketId = socket.id;
                }

                // Notifier les autres joueurs
                socket.to(`game:${partyId}`).emit('game:player-joined', {
                    userId,
                    pseudo,
                    alive: existingPlayer ? existingPlayer.alive !== false : true
                });
            }

            // Confirmer au client
            socket.emit('game:joined', {
                partyId,
                currentPhase: state.phase,
                dayNumber: state.dayNumber,
                players: mapPublicPlayers(state)
            });
        });

        // Le MJ lance la partie avec la config des rôles
        socket.on('game:start', ({ partyId, roles }) => {
            const state = gameStates[partyId];
            if (!state) {
                socket.emit('error', { message: 'Partie introuvable' });
                return;
            }
            if (socket.id !== state.masterSocketId) {
                socket.emit('error', { message: 'Seul le maître du jeu peut lancer la partie' });
                return;
            }

            // Construire la liste des rôles à distribuer
            // roles = [{ name: 'Villageois', count: 2 }, { name: 'Loup-Garou', count: 1 }, ...]
            const rolePool = [];
            for (const role of roles) {
                for (let i = 0; i < role.count; i++) {
                    rolePool.push(role.name);
                }
            }

            // Filtrer seulement les joueurs (pas le MJ)
            const playerList = state.players.filter(p => p.role === 'player');

            if (rolePool.length < playerList.length) {
                // Compléter avec Villageois si pas assez de rôles
                while (rolePool.length < playerList.length) {
                    rolePool.push('Villageois');
                }
            }

            // Mélanger les rôles (Fisher-Yates)
            for (let i = rolePool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [rolePool[i], rolePool[j]] = [rolePool[j], rolePool[i]];
            }

            // Réinitialiser l'état de la partie pour une nouvelle partie
            state.night = createEmptyNight();
            state.witchPotions = { healUsed: false, killUsed: false };
            state.votes = {};
            state.voteRunoff = null;

            // Assigner les rôles aux joueurs
            playerList.forEach((player, index) => {
                player.playerRole = rolePool[index] || 'Villageois';
                player.alive = true;
            });

            // Calculer les équipes de loups pour leur permettre de se reconnaître
            const wolves = playerList.filter(p => p.playerRole === 'Loup-Garou');

            playerList.forEach((player) => {
                if (!player.socketId) return;

                const payload = { playerRole: player.playerRole };
                if (player.playerRole === 'Loup-Garou') {
                    payload.teammates = wolves
                        .filter(w => w.userId !== player.userId)
                        .map(w => ({ userId: w.userId, pseudo: w.pseudo }));
                }

                io.to(player.socketId).emit('game:role-assigned', payload);
            });

            // Envoyer au MJ la liste complète des joueurs avec leurs rôles
            socket.emit('game:roles-distributed', {
                players: playerList.map(p => ({
                    userId: p.userId,
                    pseudo: p.pseudo,
                    playerRole: p.playerRole
                }))
            });

            console.log(`Partie ${partyId} : rôles distribués`, playerList.map(p => `${p.pseudo} -> ${p.playerRole}`));

            // Garde-fou : une config sans loup-garou est déjà gagnée pour le village
            const winner = checkWinner(state);
            if (winner) {
                endGameWithWinner(io, partyId, state, winner);
            }
        });

        // Le MJ change la phase
        socket.on('phase:change', ({ partyId, phase }) => {
            const state = gameStates[partyId];
            if (!state) {
                socket.emit('error', { message: 'Partie introuvable' });
                return;
            }

            // Vérifier que c'est le MJ
            if (socket.id !== state.masterSocketId) {
                socket.emit('error', { message: 'Seul le maître du jeu peut changer la phase' });
                return;
            }

            // Fin du vote des loups : la cible qui a le plus de votes parmi les loups est
            // désignée comme victime de la nuit. Égalité = les loups ne tuent personne.
            // Déclenché dès qu'on quitte la phase 'loup-garou', peu importe la phase suivante.
            if (state.phase === 'loup-garou' && phase !== 'loup-garou') {
                const topIds = tally(state.night.wolfVotes);
                state.night.wolfTargetId = topIds.length === 1 ? topIds[0] : null;
            }

            // Fin de nuit : résoudre les morts (loups + potion de mort, sauf soin de la sorcière)
            // Déclenché dès qu'on rentre en phase 'day' depuis n'importe quelle phase de nuit,
            // pour rester correct même si le MJ saute une étape via les raccourcis de phase.
            if (state.phase !== 'day' && state.phase !== 'lobby' && phase === 'day') {
                const deadIds = new Set();
                if (state.night.wolfTargetId && !state.night.witchHealedTonight) {
                    deadIds.add(state.night.wolfTargetId);
                }
                if (state.night.witchKillTargetId) {
                    deadIds.add(state.night.witchKillTargetId);
                }

                const deaths = [];
                deadIds.forEach(id => {
                    const p = state.players.find(pl => pl.userId === id);
                    if (p && p.alive !== false) {
                        p.alive = false;
                        deaths.push({ userId: p.userId, pseudo: p.pseudo, playerRole: p.playerRole });
                    }
                });

                state.night = createEmptyNight();

                io.to(`game:${partyId}`).emit('game:night-resolved', { deaths });
                broadcastPlayers(io, partyId, state);

                const winner = checkWinner(state);
                if (winner) {
                    endGameWithWinner(io, partyId, state, winner);
                    return;
                }
            }

            // Fin du vote de jour : dépouiller, gérer l'égalité avec un second tour
            // Déclenché dès qu'on quitte 'day' vers n'importe quelle autre phase (sauf 'end',
            // pour ne pas bloquer une fin de partie sur un second tour de vote).
            if (state.phase === 'day' && phase !== 'day' && phase !== 'end') {
                const topIds = tally(state.votes);

                if (topIds.length > 1 && !state.voteRunoff) {
                    // Premier tour à égalité : second tour restreint aux candidats à égalité
                    state.voteRunoff = { candidateIds: topIds };
                    state.votes = {};

                    const candidates = topIds
                        .map(id => state.players.find(p => p.userId === id))
                        .filter(Boolean)
                        .map(p => ({ userId: p.userId, pseudo: p.pseudo }));

                    io.to(`game:${partyId}`).emit('game:vote-tie', { candidates });
                    return; // on reste en phase 'day', pas de phase:changed
                }

                let eliminated = null;
                const tie = topIds.length > 1;
                if (topIds.length === 1) {
                    const p = state.players.find(pl => pl.userId === topIds[0]);
                    if (p) {
                        p.alive = false;
                        eliminated = { userId: p.userId, pseudo: p.pseudo, playerRole: p.playerRole };
                    }
                }

                state.votes = {};
                state.voteRunoff = null;

                io.to(`game:${partyId}`).emit('game:vote-resolved', { eliminated, tie });
                broadcastPlayers(io, partyId, state);

                const winner = checkWinner(state);
                if (winner) {
                    endGameWithWinner(io, partyId, state, winner);
                    return;
                }
            }

            // Incrémenter le jour quand on passe en phase day
            if (phase === 'day') {
                state.dayNumber++;
            }

            state.phase = phase;

            // Fin de partie demandée directement par le MJ (pas via une victoire détectée
            // au-dessus) : révéler quand même les rôles, avec un camp gagnant si l'état
            // actuel en désigne déjà un, sinon partie considérée comme interrompue.
            if (phase === 'end') {
                const winner = checkWinner(state);
                io.to(`game:${partyId}`).emit('game:over', { winner, players: fullRoster(state) });
                persistHistorique(partyId, state, winner);
            }

            // Broadcaster le changement à toute la room
            io.to(`game:${partyId}`).emit('phase:changed', {
                phase: state.phase,
                dayNumber: state.dayNumber
            });
        });

        // Un joueur soumet une action
        socket.on('action:submit', ({ partyId, action, targetId }) => {
            const state = gameStates[partyId];
            if (!state) {
                socket.emit('error', { message: 'Partie introuvable' });
                return;
            }

            const player = state.players.find(p => p.socketId === socket.id);
            if (!player) {
                socket.emit('error', { message: 'Joueur introuvable' });
                return;
            }

            if (player.alive === false) {
                socket.emit('error', { message: 'Vous êtes mort, vous ne pouvez plus agir' });
                return;
            }

            switch (action) {
                case 'loup-garou-kill': {
                    if (player.playerRole !== 'Loup-Garou' || state.phase !== 'loup-garou') {
                        socket.emit('error', { message: 'Action invalide' });
                        return;
                    }
                    // Chaque loup vote pour sa cible ; la victime finale (désignée à la fin de
                    // la phase) sera celle qui a le plus de votes parmi les loups.
                    state.night.wolfVotes[player.userId] = targetId;

                    const leaders = tally(state.night.wolfVotes);
                    const leaderId = leaders.length === 1 ? leaders[0] : null;
                    const leader = leaderId ? state.players.find(p => p.userId === leaderId) : null;

                    state.players
                        .filter(p => p.playerRole === 'Loup-Garou' && p.alive !== false && p.socketId)
                        .forEach(w => {
                            io.to(w.socketId).emit('game:wolf-target-updated', {
                                targetId: leaderId,
                                pseudo: leader ? leader.pseudo : null
                            });
                        });
                    break;
                }
                case 'sorciere-heal': {
                    if (player.playerRole !== 'Sorciere' || state.phase !== 'sorciere') {
                        socket.emit('error', { message: 'Action invalide' });
                        return;
                    }
                    if (state.witchPotions.healUsed || targetId !== state.night.wolfTargetId) {
                        socket.emit('error', { message: 'Potion de vie indisponible' });
                        return;
                    }
                    state.witchPotions.healUsed = true;
                    state.night.witchHealedTonight = true;
                    break;
                }
                case 'sorciere-kill': {
                    if (player.playerRole !== 'Sorciere' || state.phase !== 'sorciere') {
                        socket.emit('error', { message: 'Action invalide' });
                        return;
                    }
                    const targetPlayer = state.players.find(p => p.userId === targetId);
                    if (state.witchPotions.killUsed || !targetPlayer || targetPlayer.alive === false || targetId === player.userId) {
                        socket.emit('error', { message: 'Potion de mort indisponible' });
                        return;
                    }
                    state.witchPotions.killUsed = true;
                    state.night.witchKillTargetId = targetId;
                    break;
                }
                case 'vote': {
                    if (state.phase !== 'day') {
                        socket.emit('error', { message: 'Action invalide' });
                        return;
                    }
                    if (targetId === player.userId) {
                        socket.emit('error', { message: 'Vous ne pouvez pas voter pour vous-même' });
                        return;
                    }
                    if (state.voteRunoff && !state.voteRunoff.candidateIds.includes(targetId)) {
                        socket.emit('error', { message: 'Ce joueur ne fait pas partie du second tour' });
                        return;
                    }
                    state.votes[player.userId] = targetId;
                    break;
                }
                default:
                    break;
            }

            // Confirmer la réception au joueur
            socket.emit('action:received', { success: true });

            // Transmettre l'action au MJ
            if (state.masterSocketId) {
                io.to(state.masterSocketId).emit('action:received', {
                    userId: player.userId,
                    pseudo: player.pseudo,
                    action,
                    targetId
                });
            }
        });

        // La voyante consulte le rôle d'un joueur (réponse privée, pas de broadcast)
        socket.on('voyante:check', ({ partyId, targetId }, ack) => {
            const state = gameStates[partyId];
            if (!state) {
                if (typeof ack === 'function') ack({ error: 'Partie introuvable' });
                return;
            }

            const player = state.players.find(p => p.socketId === socket.id);
            if (!player || player.playerRole !== 'Voyante' || player.alive === false || state.phase !== 'voyante') {
                if (typeof ack === 'function') ack({ error: 'Action invalide' });
                return;
            }

            const target = state.players.find(p => p.userId === targetId);
            if (typeof ack === 'function') {
                ack({ targetId, role: target ? target.playerRole : null });
            }
        });

        // La sorcière récupère le contexte de la nuit (cible des loups, potions restantes)
        socket.on('sorciere:get-context', ({ partyId }, ack) => {
            const state = gameStates[partyId];
            if (!state) {
                if (typeof ack === 'function') ack({ error: 'Partie introuvable' });
                return;
            }

            const player = state.players.find(p => p.socketId === socket.id);
            if (!player || player.playerRole !== 'Sorciere') {
                if (typeof ack === 'function') ack({ error: 'Action invalide' });
                return;
            }

            const wolfTarget = state.night.wolfTargetId
                ? state.players.find(p => p.userId === state.night.wolfTargetId)
                : null;

            if (typeof ack === 'function') {
                ack({
                    wolfTarget: wolfTarget ? { userId: wolfTarget.userId, pseudo: wolfTarget.pseudo } : null,
                    healUsed: state.witchPotions.healUsed,
                    killUsed: state.witchPotions.killUsed
                });
            }
        });

        // Un joueur mort consulte la liste complète des joueurs avec leurs rôles (mode spectateur)
        socket.on('game:get-roster', ({ partyId }, ack) => {
            const state = gameStates[partyId];
            if (!state) {
                if (typeof ack === 'function') ack({ error: 'Partie introuvable' });
                return;
            }

            const player = state.players.find(p => p.socketId === socket.id);
            const isMaster = socket.id === state.masterSocketId;
            const gameOver = state.phase === 'end';
            if (!isMaster && !gameOver && (!player || player.alive !== false)) {
                if (typeof ack === 'function') ack({ error: 'Action invalide' });
                return;
            }

            if (typeof ack === 'function') {
                ack({ players: fullRoster(state) });
            }
        });

        // Déconnexion : ne pas supprimer le joueur (permettre la reconnexion)
        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });
}

module.exports = registerSocketHandlers;
