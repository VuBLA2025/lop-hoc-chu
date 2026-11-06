import { IS_STAGE } from './live/page';
import { StageFrame } from './live/StageFrame';
import { Dashboard } from './live/Dashboard';
import { useGame } from './game/useGame';
import { GameStage } from './game/GameStage';
import { GameControls } from './game/GameControls';

export default function App() {
  const game = useGame();

  // Trang cho TikTok LIVE Studio: chỉ có màn hình game
  if (IS_STAGE) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black">
        <StageFrame>
          <GameStage game={game} />
        </StageFrame>
      </div>
    );
  }

  // Trang điều khiển: chỉ panel quản lí (xem stage thật ở tab riêng)
  return (
    <Dashboard
      status={game.status}
      channelName={game.channelName}
      extra={<GameControls view={game.view} stageCount={game.stageCount} />}
    />
  );
}
