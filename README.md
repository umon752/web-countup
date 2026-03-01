# web-countup

一個基於 Web Component 的計數器動畫元件，支援隨機模式與順序模式，提供流暢的數字跑動動畫效果。

## 安裝

### 套件管理

```bash
# 使用 npm
npm install @umon752/web-countup

# 使用 pnpm
pnpm add @umon752/web-countup

# 使用 yarn
yarn add @umon752/web-countup
```

### CDN

```html
<!-- unpkg -->
<script type="module" src="https://unpkg.com/@umon752/web-countup"></script>

<!-- jsDelivr -->
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@umon752/web-countup"
></script>
```

## 使用方式

### 基本使用

```html
<web-countup duration="2000" start-num="0">12345</web-countup>

<script type="module">
  import { WebCountup } from '@umon752/web-countup';

  const counter = document.querySelector('web-countup');
  counter.run();
</script>
```

### 隨機模式（預設）

```html
<!-- 非純數字會自動使用隨機模式 -->
<web-countup duration="2000">123,567.98</web-countup>

<!-- 純數字也可以啟用隨機模式 -->
<web-countup duration="2000" random-mode-enable="true">1000</web-countup>
```

### 順序模式 + 千分位

```html
<web-countup
  duration="2000"
  start-num="0"
  random-mode-enable="false"
  random-mode-thousand-comma="true"
  >1000</web-countup
>
```

### 監聽事件

```html
<web-countup id="counter" duration="2000">12345</web-countup>

<script type="module">
  const counter = document.getElementById('counter');

  // 監聽計數完成事件
  counter.addEventListener('web-countup:done', (e) => {
    console.log('計數完成:', e.detail.value);
  });

  // 監聽其他事件
  counter.addEventListener('web-countup:run', (e) => {
    console.log('開始執行');
  });

  counter.addEventListener('web-countup:stop', (e) => {
    console.log('已停止');
  });

  counter.run();
</script>
```

## API

### 屬性 (Attributes)

| 屬性名稱                     | 類型    | 預設值  | 說明                                 |
| ---------------------------- | ------- | ------- | ------------------------------------ |
| `duration`                   | number  | `1000`  | 計數動畫的持續時間（毫秒）           |
| `start-time`                 | number  | `0`     | 開始計數之前的延遲時間（毫秒）       |
| `delay`                      | number  | `0`     | 每次計數更新之間的延遲時間（毫秒）   |
| `start-num`                  | number  | `0`     | 起始計數的數字                       |
| `random-mode-enable`         | boolean | `true`  | 是否啟用隨機模式                     |
| `random-mode-thousand-comma` | boolean | `false` | 是否啟用千分位符號（僅順序模式有效） |

### 方法 (Methods)

#### `run()`

執行計數器，有設定 `start-time` 會延遲開始計數時間。

```javascript
counter.run();
```

#### `stop()`

停止計數器的執行，暫停計數動畫。

```javascript
counter.stop();
```

#### `start()`

啟動計數器，繼續執行計數動畫，不會執行 `start-time` 延遲。

```javascript
counter.start();
```

#### `reset()`

重置計數器，將計數器恢復到初始狀態，暫停計數動畫。

```javascript
counter.reset();
```

#### `restart()`

重新啟動計數器，重置並開始新的計數動畫，有設定 `start-time` 會延遲開始計數時間。

```javascript
counter.restart();
```

### 事件 (Events)

所有事件都會傳遞以下格式的 `detail`：

```typescript
interface IWebCountupEventDetail {
  element: WebCountup;
  value: number | string;
}
```

| 事件名稱              | 說明          | 觸發時機                |
| --------------------- | ------------- | ----------------------- |
| `web-countup:run`     | 執行計數      | 呼叫 `run()` 方法時     |
| `web-countup:stop`    | 停止計數      | 呼叫 `stop()` 方法時    |
| `web-countup:start`   | 開始/繼續計數 | 呼叫 `start()` 方法時   |
| `web-countup:reset`   | 重置計數      | 呼叫 `reset()` 方法時   |
| `web-countup:restart` | 重新啟動      | 呼叫 `restart()` 方法時 |
| `web-countup:done`    | 計數完成      | 計數動畫完成時          |

## TypeScript 支援

本套件使用 TypeScript 開發，提供完整的型別定義。

```typescript
import { WebCountup, type IWebCountupEventDetail } from '@umon752/web-countup';

const counter = document.createElement('web-countup') as WebCountup;
counter.setAttribute('duration', '2000');
counter.textContent = '12345';

counter.addEventListener(
  'web-countup:done',
  (e: CustomEvent<IWebCountupEventDetail>) => {
    console.log('完成:', e.detail.value);
  },
);

counter.run();
```

## 注意事項

- 計數器可以以隨機模式或非隨機模式運行，具體取決於 `random-mode-enable` 屬性的設置和計數器內容是否僅包含數字
- 計數器內容只要包含非數字的字元，`random-mode-enable` 設定為 `false` 會無效，一律以隨機模式執行
- 千分位符號 `random-mode-thousand-comma` 只在順序模式（`random-mode-enable="false"`）且為純數字時有效
- `random-mode-enable` 和 `random-mode-thousand-comma` 不能同時為 `true`

## License

MIT
