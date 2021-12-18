import React from 'react';
// ffmpeg stuff
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
const ffmpeg = createFFmpeg({
  log: true
});

const framesInitialState = {
  frames: [],
  count: 0
};
function framesReducer(state, action) {
  switch (action.type) {
    case 'ADD_FRAME': {
      return {
        frames: [...state.frames, action.frame],
        count: state.count + 1
      };
    }
    case 'REMOVE_FRAME': {
      const frames = [...state.frames];
      frames.splice(action.index, 1);
      return { frames, count: state.count - 1 };
    }
    case 'RESET': {
      return framesInitialState;
    }
    default: {
      throw new Error();
    }
  }
}

function Frames({ frames }) {
  return frames.map((frame, index) => (
    <img
      width="100"
      height="100"
      style={{ border: '1px solid black' }}
      src={URL.createObjectURL(frame)}
      key={`frame[${index}]`}
    />
  ));
}

function Home() {
  // State
  const [ready, setReady] = React.useState(false);
  const [gif, setGif] = React.useState();
  // Refs
  const mouse = React.useRef({ x: 0, y: 0, down: false });
  const board = React.useRef();
  const ctx = React.useRef();
  // Reducer
  const [state, dispatch] = React.useReducer(framesReducer, framesInitialState);
  // Handler Functions
  const setupBoard = () => {
    ctx.current = board.current.getContext('2d');
    ctx.current.fillStyle = 'white';
    ctx.current.strokeStyle = 'red';
    ctx.current.lineWidth = 5;
    ctx.current.fillRect(0, 0, board.current.width, board.current.height);
  };

  const addFrame = () => {
    board.current.toBlob(blob => {
      dispatch({ type: 'ADD_FRAME', frame: blob });
      ctx.current.fillRect(0, 0, board.current.width, board.current.height);
    });
  };
  const removeFrame = () => {
    dispatch({ type: 'REMOVE_FRAME', index: state.count - 1 });
  };
  const handleMouseDown = event => {
    const x = event.nativeEvent.offsetX;
    const y = event.nativeEvent.offsetY;
    mouse.current = { x, y, down: true };
  };
  const handleMouseMove = event => {
    if (!mouse.current.down) return;
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
  const handleMouseUp = event => {
    const x = event.nativeEvent.offsetX;
    const y = event.nativeEvent.offsetY;
    ctx.current.beginPath();
    ctx.current.moveTo(mouse.current.x, mouse.current.y);
    ctx.current.lineTo(x, y);
    ctx.current.stroke();
    ctx.current.closePath();
    mouse.current = { x, y, down: false };
  };

  const createGif = async () => {
    if (!ready) return;

    const inputFiles = [];
    for (let index = 0; index < state.count; index++) {
      const file = new File([state.frames[index]], `frame-${index}.png`, {
        type: 'image/png'
      });
      ffmpeg.FS('writeFile', file.name, await fetchFile(file));
      inputFiles.push('-i');
      inputFiles.push(file.name);
    }

    await ffmpeg.run(
      '-f',
      'image2',
      '-framerate',
      '10',
      '-i',
      'frame-%1d.png',
      'out.gif'
    );

    // Read the result
    const data = ffmpeg.FS('readFile', 'out.gif');
    // Create a URL
    const url = URL.createObjectURL(
      new Blob([data.buffer], { type: 'image/gif' })
    );
    console.log(url);
    setGif(url);
  };

  const load = async () => {
    await ffmpeg.load();
    setReady(true);
  };

  React.useEffect(() => {
    load();
    setupBoard();
  }, []);

  return (
    <div>
      <h3>Anigif</h3>
      <div>
        <button onClick={addFrame}>Add Frame</button>
        <button onClick={removeFrame}>Remove Frame</button>
        <button disabled={!ready} onClick={createGif}>
          Create Gif
        </button>
      </div>
      <canvas
        width="500"
        height="500"
        style={{ border: '1px solid red' }}
        ref={board}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      ></canvas>
      <div style={{ display: 'flex', gap: '16px' }}>
        <Frames frames={state.frames} />
      </div>
      {gif && <img src={gif} width="250" />}
    </div>
  );
}

export default Home;
