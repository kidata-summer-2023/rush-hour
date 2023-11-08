import React from "react";
import { Graph } from "./Graph";
import { Grid } from "./Grid";
import { isLegalMove } from "./legalMove/legalMove";

function carsToGrid(cars: Record<string, number[][]>): string[][] {
  let grid: string[][] = []

  for (let i = 0; i < 6; i++) {
    grid.push([])
    for (let j = 0; j < 6; j++) {
      grid[i].push('white')
    }
  }

  if (Object.keys(cars).length === 0) {
    return grid
  }

  for (let car in cars) {
    for (let coord of cars[car]) {
      grid[coord[0]][coord[1]] = car
    }
  }

  return grid
}

// function to take a cars list and convert it to a id using a hash
function carsToId(cars: Record<string, number[][]>): number {
  let id = 0;
  for (let car in cars) {
    id += parseInt(car) * Math.pow(9973, 2);
    for (let coord of cars[car]) {
      let singleValue = coord[0] * 100 + coord[1];
      id += singleValue * Math.pow(9973, parseInt(car));
    }
  }

  return id % Math.pow(2, 32);
}

const areCarsEqual = (car1: number[][], car2: number[][]): boolean => {
  return JSON.stringify(car1) === JSON.stringify(car2);
};

function carsEqual(cars1: Record<string, number[][]>, cars2: Record<string, number[][]>): boolean {
  if (Object.keys(cars1).length !== Object.keys(cars2).length) return false;

  for (let carId in cars1) {
    let foundMatch = false;
    if (areCarsEqual(cars1[carId], cars2[carId])) {
      foundMatch = true;
      break;
    }
    if (!foundMatch) return false;
  }

  return true;
}

const initialCars: Record<string, number[][]> = {
  "red": [[0, 0], [0, 1]],
  "blue": [[5, 4], [5, 5]],
}

function App() {
  const ws = React.useRef<WebSocket | null>(null);
  const cars = React.useRef<Record<string, number[][]>>(initialCars);
  const states = React.useRef<number[]>([carsToId(initialCars)]);
  const stateTransitions = React.useRef<[number, number][]>([])
  const [render, setRender] = React.useState<boolean>(false)
  const [message, setMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    ws.current = new WebSocket('ws://localhost:8000/ws');

    ws.current.onmessage = (message) => {
      let data = JSON.parse(message.data);
      let oldCarsId = carsToId(cars.current);
      let newCarsId = carsToId(data.cars);

      // Update states
      // if it is a new state
      if (isLegalMove(cars.current, data.cars)) {
        if (!states.current.includes(newCarsId)) {
          // check if a new transition is needed
          states.current.push(newCarsId)
          // very first time, we don't have a old state
          if (oldCarsId !== 0) {
            stateTransitions.current.push([oldCarsId, newCarsId])
          }
        } else if (oldCarsId !== newCarsId) {
          // if it is not a new state, check if a new transition is needed by checking if we have been here before
          if (!states.current.includes(oldCarsId)) {
            states.current.push(oldCarsId)
          }
        }

        cars.current = data.cars;
        setMessage(null)
      } else if (!carsEqual(cars.current, data.cars)) {
        setMessage("Illegal move, please put it back to the last position")
      }

      setRender(render => !render);
    };

    ws.current.onopen = () => {
      ws.current?.send(JSON.stringify({ event: 'connected' }));
    };

    return () => {
      ws.current?.close();
    };
  }, []);

  let state = carsToId(cars.current)
  let grid = carsToGrid(cars.current)


  return (
    // tailwind that splits the screen into 2 columns
    <div>
      <div className="grid grid-cols-2 min-h-screen">
        <Grid grid={grid} />
        <div className="flex flex-col items-center">
          <div className="text-2xl text-center h-12">{message}</div>
          <Graph state={state} states={states.current} stateTransitions={stateTransitions.current} />
        </div>
      </div >
    </div>
  );
}

export default App;