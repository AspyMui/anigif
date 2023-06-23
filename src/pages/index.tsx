import React from "react";
// ffmpeg stuff
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
import Image from "next/image";
const ffmpeg = createFFmpeg({
  log: true,
});

type Frame = Blob;
type StoreState = {
  frames: Frame[];
  count: number;
};
type Action = {
  type: string;
  frame?: Frame;
  index?: number;
};

const framesInitialState: StoreState = {
  frames: [],
  count: 0,
};

function framesReducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case "ADD_FRAME": {
      if (action.frame) {
        return {
          frames: [...state.frames, action.frame],
          count: state.count + 1,
        };
      }
      return state;
    }
    case "REMOVE_FRAME": {
      if (action.index) {
        const frames = [...state.frames];
        frames.splice(action.index, 1);
        return { frames, count: state.count - 1 };
      }
      return state;
    }
    case "RESET": {
      return framesInitialState;
    }
    default: {
      throw new Error();
    }
  }
}

function Frames(props: { frames: Frame[] }) {
  return (
    <div className="mb-4 overflow-scroll">
      <div className="flex gap-2 overflow-scroll">
        {props.frames.map((frame, index) => (
          <Image
            width="100"
            height="100"
            alt={`frame-${index}`}
            className="rounded-lg border-2 border-solid"
            src={URL.createObjectURL(frame)}
            key={`frame[${index}]`}
          />
        ))}
      </div>
    </div>
  );
}

function Home() {
  // State
  const [ready, setReady] = React.useState(false);
  const [gif, setGif] = React.useState("");
  // Refs
  const mouse = React.useRef({ x: 0, y: 0, down: false });
  const board = React.useRef<HTMLCanvasElement>(null);
  const ctx = React.useRef<CanvasRenderingContext2D>();
  // Reducer
  const [state, dispatch] = React.useReducer(framesReducer, framesInitialState);

  // Handler Functions
  const setupBoard = () => {
    if (!board.current) return;
    const context = board.current.getContext("2d");
    if (!context) return;
    ctx.current = context;

    ctx.current.fillStyle = "white";
    ctx.current.strokeStyle = "rgb(245 158 11)";
    ctx.current.lineWidth = 5;
    ctx.current.fillRect(0, 0, board.current.width, board.current.height);
  };

  const addFrame = () => {
    if (!board.current) return;

    board.current.toBlob((blob) => {
      if (!board.current) return;
      if (!ctx.current) return;
      if (!blob) return;

      dispatch({ type: "ADD_FRAME", frame: blob });
      ctx.current.fillRect(0, 0, board.current.width, board.current.height);
    });
  };
  const removeFrame = () => {
    dispatch({ type: "REMOVE_FRAME", index: state.count - 1 });
  };
  const handleMouseDown = (event: React.MouseEvent) => {
    const x = event.nativeEvent.offsetX;
    const y = event.nativeEvent.offsetY;
    mouse.current = { x, y, down: true };
  };
  const handleMouseMove = (event: React.MouseEvent) => {
    if (!mouse.current.down) return;
    if (!ctx.current) return;

    // Draw line segments
    const x = event.nativeEvent.offsetX;
    const y = event.nativeEvent.offsetY;
    ctx.current.beginPath();
    ctx.current.moveTo(mouse.current.x, mouse.current.y);
    ctx.current.lineTo(x, y);
    ctx.current.stroke();
    ctx.current.closePath();
    mouse.current = { x, y, down: true };
  };
  const handleMouseUp = (event: React.MouseEvent) => {
    if (!ctx.current) return;

    const x = event.nativeEvent.offsetX;
    const y = event.nativeEvent.offsetY;
    ctx.current.beginPath();
    ctx.current.moveTo(mouse.current.x, mouse.current.y);
    ctx.current.lineTo(x, y);
    ctx.current.stroke();
    ctx.current.closePath();
    mouse.current = { x, y, down: false };
  };

  const createGif = () => {
    if (!ready) return;

    async function handleGifCreation() {
      try {
        const inputFiles = [];
        for (let index = 0; index < state.count; index++) {
          const blob = state.frames[index];
          if (blob) {
            const file = new File([blob], `frame-${index}.png`, {
              type: "image/png",
            });
            ffmpeg.FS("writeFile", file.name, await fetchFile(file));
            inputFiles.push("-i");
            inputFiles.push(file.name);
          }
        }

        await ffmpeg.run(
          "-f",
          "image2",
          "-framerate",
          "10",
          "-i",
          "frame-%1d.png",
          "out.gif"
        );

        // Read the result
        const data = ffmpeg.FS("readFile", "out.gif");
        // Create a URL
        const url = URL.createObjectURL(
          new Blob([data.buffer], { type: "image/gif" })
        );
        console.log(url);
        setGif(url);
      } catch (error) {
        throw Error("Something went wrong.");
      }
    }
    handleGifCreation().catch((error) => console.error(error));
  };

  const load = async () => {
    await ffmpeg.load();
    setReady(true);
  };

  React.useEffect(() => {
    load()
      .then(() => {
        setupBoard();
      })
      .catch((error) => console.error(error));
  }, []);

  return (
    <div className="flex place-items-center p-8">
      <div className="m-auto max-w-screen-sm text-center">
        <h1 className="mb-4 text-6xl">anigif</h1>
        <div className="mb-4 flex items-stretch gap-2">
          <button className="btn-primary" onClick={addFrame}>
            Add Frame
          </button>
          <button className="btn-primary" onClick={removeFrame}>
            Remove Frame
          </button>
          <button className="btn-primary" disabled={!ready} onClick={createGif}>
            Create Gif
          </button>
        </div>
        <canvas
          className="mb-4 rounded-lg border-2 border-solid"
          width="636"
          height="636"
          ref={board}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        ></canvas>
        <Frames frames={state.frames} />

        {gif && (
          <Image
            src={gif}
            alt="animated-gif-drawing"
            width="250"
            height="250"
            className="m-auto mb-4 rounded-lg border-2 border-solid"
          />
        )}
      </div>
    </div>
  );
}

export default Home;
