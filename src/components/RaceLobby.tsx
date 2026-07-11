import { Button } from "@/components/ui/button";
import { H2, Muted, Small } from "@/components/ui/typography";
import type { PlayerSnapshot } from "@/types/race";

interface RaceLobbyProps {
  players: PlayerSnapshot[];
  myPlayerId: string;
  creatorId: string | null;
  roomCode: string;
  onStart: () => void;
}

export default function RaceLobby({
  players,
  myPlayerId,
  creatorId,
  roomCode,
  onStart,
}: RaceLobbyProps) {
  const isCreator = myPlayerId === creatorId;
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/race/${roomCode}`
      : `/race/${roomCode}`;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <H2>Waiting for players</H2>
        <Muted>Share this link to invite others:</Muted>
        <code className="bg-accent text-accent-foreground mt-1 block rounded-md px-3 py-2 text-sm break-all">
          {shareUrl}
        </code>
      </div>

      <div className="flex flex-col gap-3">
        <Small className="text-muted-foreground block tracking-wider uppercase">
          Players ({players.length})
        </Small>
        <ul className="flex flex-col gap-2">
          {players.map((player) => (
            <li key={player.playerId} className="flex items-center gap-3">
              <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
              <span className="text-foreground">{player.username}</span>
              {player.isCreator && <Muted>(host)</Muted>}
              {player.playerId === myPlayerId && <Muted>(you)</Muted>}
            </li>
          ))}
        </ul>
      </div>

      {isCreator ? (
        <Button
          onClick={onStart}
          variant="primary"
          className="self-start"
          disabled={players.length < 1}
        >
          Start Race
        </Button>
      ) : (
        <Muted>Waiting for the host to start…</Muted>
      )}
    </div>
  );
}
