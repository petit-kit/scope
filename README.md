# @petit-kit/scope

A lightweight, reactive web component framework with built-in plugins for modern web development.

## Features

- **Reactive Properties**: Automatic re-rendering when properties change
- **Shadow DOM Support**: Optional shadow DOM encapsulation
- **Plugin System**: Built-in plugins for common web development tasks
- **TypeScript Support**: Full TypeScript support with type definitions
- **Lightweight**: Minimal bundle size with zero dependencies (except utils)
- **Modern APIs**: Uses modern web standards and APIs

## Installation

```bash
npm install @petit-kit/scope
```

## Quick Start

```javascript
import Component from '@petit-kit/scope';

class MyComponent extends Component {
  constructor() {
    super({
      shadow: true,
      props: {
        count: { type: "number", default: 0, reflect: true },
        message: { type: "string", default: "Hello World" },
      },
      styles: `
      :host { display: block; padding: 1rem; }
      button { margin: 0.5rem; }
    `,
      plugins: [events],
    });
  }

  onMount() {
    this.plugins.delegate("button", "click", () => {
      this.set("count", this.get("count") + 1);
    });
  }

  render(props) {
    return `
    <h1>${props.message}</h1>
    <p>Count: ${props.count}</p>
    <button>Increment</button>
  `;
  }
}
customElements.define("my-component", MyComponent);
```

## Component Class

The `Component` class extends `HTMLElement` and provides a reactive, plugin-based architecture for building web components.

### Constructor Options

```javascript
super({
  shadow?: boolean,           // Enable shadow DOM (default: false)
  props?: object,            // Property definitions
  styles?: string,           // CSS styles
  stylesSheets?: Function[], // Style sheet functions
  plugins?: any[]           // Plugin functions
})
```

### Property Definitions

Properties can be defined with the following options:

```javascript
props: {
  count: {
    type: 'number',           // Data type: 'string', 'number', 'array', 'object'
    default: 0,              // Default value
    reflect: true,           // Reflect to attribute
    noRender: false,         // Skip re-render on change
    ref: reactiveRef         // Reactive reference
  }
}
```

### Core Methods

#### `get(key: string)`
Get a property value.

#### `set(key: string, value: any, noReflect?: boolean)`
Set a property value and trigger re-render. The value can be a function that receives the previous value.

#### `$(selector: string, context?: HTMLElement)`
Query elements within the component.

#### `update()`
Manually trigger a re-render.

#### `destroy()`
Clean up the component and remove it from DOM.

### Lifecycle Methods

- `onPreMount()`: Called before component is mounted
- `onMount()`: Called after component is mounted
- `onUnmount()`: Called when component is unmounted
- `onUpdate(changes, props)`: Called when properties change
- `render(props)`: Return HTML string for rendering

## Plugins

### Events Plugin

Handles events listeners with automatic cleanup.

```javascript
// Add event listener
this.plugins.on('button', 'click', (e) => {
  console.log('Button clicked');
});

// Add event listener with options
this.plugins.on('button', 'click', (e) => {
  console.log('Button clicked');
}, { persist: true, passive: true });

// Remove event listener
this.plugins.off('button', 'click', callback);

// Event delegation
this.plugins.delegate('.item', 'click', (e) => {
  console.log('Item clicked:', e.target);
});
```

### Fetch Plugin

Manages HTTP requests with automatic abort on unmount.

```javascript
// Single fetch
const data = await this.plugins.fetch('/api/data');

// Multiple fetches
const results = await this.plugins.fetchs(['/api/1', '/api/2']);

// Abort specific request
this.plugins.abortFetch('/api/data');

// Clear all requests
this.plugins.clearAllFetches();
```

### Time Plugin

Manages timers and animations with automatic cleanup.

```javascript
// Set interval
const cancelInterval = this.plugins.interval((elapsed) => {
  console.log('Elapsed:', elapsed);
}, 1000, 'myInterval');

// Set timeout
const cancelTimeout = this.plugins.timeout(() => {
  console.log('Timeout fired');
}, 5000, 'myTimeout');

// Request animation frame
const cancelRaf = this.plugins.raf((time) => {
  console.log('Animation frame:', time);
}, 'myAnimation');

// Cancel specific timers
this.plugins.clearInterval('myInterval');
this.plugins.clearTimeout('myTimeout');
this.plugins.clearRaf('myAnimation');

// Clear all timers
this.plugins.clearIntervals();
this.plugins.clearTimeouts();
this.plugins.clearRafs();
```

### InView Plugin

Monitors element visibility using Intersection Observer.

```javascript
class MyComponent extends Component {
  constructor() {
    super({
      plugins: [inView],
      inView: {
        inViewThreshold: 0.5,  // Optional: threshold for intersection
        inViewElement: '.target' // Optional: specific element to observe
      }
    });
  }

  onInView(entry) {
    console.log('Element is in view:', entry);
  }

  onOutView(entry) {
    console.log('Element is out of view:', entry);
  }
}
```

## Advanced Examples

### Reactive Properties with References

```javascript
import Component from '@petit-kit/scope';

class CounterComponent extends Component {
  constructor() {
    super({
      shadow: true,
      props: {
        count: {
          type: 'number',
          default: 0,
          reflect: true,
          ref: {
            get: () => this._count,
            set: (value) => { this._count = value; },
            subscribe: (callback) => this._subscribers.push(callback)
          }
        }
      }
    });
  }

  render(props) {
    return `
      <div>
        <h2>Count: ${props.count}</h2>
        <button id="increment">+</button>
        <button id="decrement">-</button>
      </div>
    `;
  }

  onMount() {
    this.plugins.on('#increment', 'click', () => {
      this.set('count', this.get('count') + 1);
    });

    this.plugins.on('#decrement', 'click', () => {
      this.set('count', this.get('count') - 1);
    });
  }
}
```

### Component with Multiple Plugins

```javascript
import Component, { time, fetch, events, inView } from '@petit-kit/scope';

class DataComponent extends Component {
  constructor() {
    super({
      shadow: true,
      props: {
        data: { type: 'object', default: {} },
        loading: { type: 'boolean', default: false }
      },
      plugins: [time, fetch, events, inView]
    });
  }

  async onMount() {
    // Auto-refresh data every 30 seconds
    this.plugins.interval(async () => {
      await this.loadData();
    }, 30000, 'dataRefresh');

    // Load initial data
    await this.loadData();
  }

  async loadData() {
    this.set('loading', true);
    try {
      const data = await this.plugins.fetch('/api/data');
      this.set('data', data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      this.set('loading', false);
    }
  }

  onInView(entry) {
    console.log('Component is visible:', entry.isIntersecting);
  }

  render(props) {
    if (props.loading) {
      return '<div>Loading...</div>';
    }

    return `
      <div>
        <h2>Data</h2>
        <pre>${JSON.stringify(props.data, null, 2)}</pre>
      </div>
    `;
  }
}
```

### Reactive Updates with Functions

```javascript
class CounterComponent extends Component {
  constructor() {
    super({
      props: {
        count: { type: 'number', default: 0 }
      }
    });
  }

  onMount() {
    this.plugins.on('button', 'click', () => {
      // Use function to update based on previous value
      this.set('count', (prev) => prev + 1);
    });
  }

  render(props) {
    return `
      <div>
        <h2>Count: ${props.count}</h2>
        <button>Increment</button>
      </div>
    `;
  }
}
```

## TypeScript Support

The package includes full TypeScript support with type definitions:

```typescript
import Component from '@petit-kit/scope';

interface MyProps {
  count: number;
  message: string;
}

class MyComponent extends Component {
  props!: MyProps;

  constructor() {
    super({
      props: {
        count: { type: 'number' as const, default: 0 },
        message: { type: 'string' as const, default: '' }
      }
    });
  }
}
```

## Browser Support

- Modern browsers with Web Components support
- Shadow DOM support (optional)
- ES2015+ features

## License

MIT © [@petitssoldats](https://github.com/petitssoldats)
