/**
 * Web Countup Component Events Detail Interface
 */
interface IWebCountupEventDetail {
  element: WebCountup;
  value: number | string;
}

// 為 Custom Elements 擴充全域型別定義
declare global {
  interface HTMLElementTagNameMap {
    'web-countup': WebCountup;
  }

  interface HTMLElementEventMap {
    'web-countup:run': CustomEvent<IWebCountupEventDetail>;
    'web-countup:stop': CustomEvent<IWebCountupEventDetail>;
    'web-countup:start': CustomEvent<IWebCountupEventDetail>;
    'web-countup:reset': CustomEvent<IWebCountupEventDetail>;
    'web-countup:restart': CustomEvent<IWebCountupEventDetail>;
    'web-countup:done': CustomEvent<IWebCountupEventDetail>;
  }
}

/**
 * Countup Web Component 類別
 * 繼承自 HTMLElement，提供標準的 Custom Element 介面
 * 預設跑動方式為: random 隨機模式
 * @param {Number} duration（ms）計數動畫的持續時間
 * @param {Number} startTime（ms）開始計數之前的延遲時間
 * @param {Number} delay（ms）每次計數更新之間的延遲時間
 * @param {Number} startNum 起始計數的數字
 * @param {Boolean} randomModeEnable 是否啟用隨機模式，預設 true（計數器內容只要包含非數字的字元，此項設定 false 會無效，一律以隨機模式執行）
 * @param {Boolean} randomModeThousandComma 是否啟用千分位符號（計數器內容只要包含非數字的字元，此項設定 true 則會無效）
 */
class WebCountup extends HTMLElement {
  private duration: number = 1000;
  private startTime: number = 0;
  private delay: number = 0;
  private startNum: number = 0;
  private randomModeEnable: boolean = true;
  private randomModeThousandComma: boolean = false;

  private originalCounterText: string = ''; // 保存原始的計數器文字
  private counterText: string = '';
  private currentNum: number = 0;
  private isPureNum: boolean = true;
  private timerId: number | null = null;
  private singleTextArray: Array<{
    timerId: number | null;
    durationTimestamp: number | null;
    orgText: string;
    randomText: string | null;
  }> = [];
  private maxNum: number = 9;
  private fps: number = 60;
  private isStop: boolean = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  /**
   * 定義觀察的屬性
   * 當這些屬性變更時會觸發 attributeChangedCallback
   */
  static get observedAttributes(): string[] {
    return [
      'countup-duration',
      'countup-start-time',
      'countup-delay',
      'countup-start-num',
      'countup-random-mode',
      'countup-thousand-comma',
    ];
  }

  /**
   * 元件連接到 DOM 時的回調
   */
  connectedCallback() {
    this._createShadowDom();
    // 第一次初始化時保存原始文字
    if (!this.originalCounterText) {
      this.originalCounterText = this.textContent?.trim() || '';
    }
    this._init();
  }

  /**
   * 屬性變更時的回調
   */
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'countup-duration':
        this.duration = this._parseNumber(newValue, 1000, 0);
        break;
      case 'countup-start-time':
        this.startTime = this._parseNumber(newValue, 0, 0);
        break;
      case 'countup-delay':
        this.delay = this._parseNumber(newValue, 0, 0);
        break;
      case 'countup-start-num':
        this.startNum = this._parseNumber(newValue, 0, 0);
        this.currentNum = this.startNum;
        break;
      case 'countup-random-mode':
        this.randomModeEnable = newValue !== 'false';
        break;
      case 'countup-thousand-comma':
        this.randomModeThousandComma = newValue === 'true';
        break;
    }
  }

  /**
   * 建立 shadow dom
   */
  private _createShadowDom() {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`
      :host {
        display: inline-block;
      }
    `);

    this.shadowRoot!.adoptedStyleSheets = [sheet];

    const slot = document.createElement('slot');
    this.shadowRoot!.appendChild(slot);
  }

  /**
   * 初始化元件
   */
  private _init() {
    try {
      // 讀取屬性
      this.duration = this._parseNumber(this.getAttribute('countup-duration'), 1000, 0);
      this.startTime = this._parseNumber(this.getAttribute('countup-start-time'), 0, 0);
      this.delay = this._parseNumber(this.getAttribute('countup-delay'), 0, 0);
      this.startNum = this._parseNumber(this.getAttribute('countup-start-num'), 0, 0);
      this.randomModeEnable = this.getAttribute('countup-random-mode') !== 'false';
      this.randomModeThousandComma = this.getAttribute('countup-thousand-comma') === 'true';

      // randomMode 驗證
      if (this.randomModeEnable && this.randomModeThousandComma) {
        throw new Error('randomMode thousandComma cannot be used true');
      }

      // 使用保存的原始計數器文字（不重新讀取，避免 reset 時丟失目標值）
      this.counterText = this.originalCounterText;
      this.isPureNum = !isNaN(Number(this.counterText));
      this.currentNum = this.startNum;

      // 設定初始顯示
      this.textContent = this.startNum.toString();
    } catch (error) {
      console.error('Countup initialization error:', error);
    }
  }

  /**
   * 解析數字屬性
   */
  private _parseNumber(value: string | null, defaultValue: number, minValue: number): number {
    if (value === null) return defaultValue;
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < minValue) return defaultValue;
    return parsed;
  }

  /**
   * 執行計數開始
   */
  private _runStart() {
    if (!this.randomModeEnable && !this.isPureNum) {
      console.warn('randomMode enable cannot be used false');
    }

    // 不啟用 randomMode -> 從 0 開始跑動
    if (!this.randomModeEnable && this.isPureNum) {
      this._runSequential();
    } else {
      this._runRandom();
    }
  }

  /**
   * 順序模式計數
   */
  private _runSequential() {
    const domNum = parseInt(this.counterText);
    let delayTimestamp = 0;

    const runCount = (timestamp: number) => {
      const increasmentPerFrame = (domNum - this.startNum) / (this.duration / 16.67);
      this.currentNum = this.currentNum + increasmentPerFrame;

      if (this.currentNum < domNum) {
        if (!this.isStop) {
          if (timestamp - delayTimestamp >= this.delay) {
            this._render();
            delayTimestamp = timestamp;
          }
          requestAnimationFrame(runCount.bind(this));
        }
      } else {
        this._render(true);
        this._dispatchDoneEvent();
      }
    };

    if (!this.timerId) {
      this.timerId = requestAnimationFrame(runCount.bind(this));
    } else {
      requestAnimationFrame(runCount.bind(this));
    }
  }

  /**
   * 隨機模式計數
   */
  private _runRandom() {
    const domTextArray = this.counterText.split('');
    let isDone = false;
    let delayTimestamp = 0;

    domTextArray.forEach((text, i) => {
      this.singleTextArray[i] = {
        timerId: null,
        durationTimestamp: null,
        orgText: text,
        randomText: null,
      };

      if (!isNaN(Number(text))) {
        const runCount = (timestamp: number) => {
          const item = this.singleTextArray[i];
          if (!item) return;
          
          if (!item.durationTimestamp) {
            item.durationTimestamp = timestamp;
          }

          let elapsedTime = timestamp - item.durationTimestamp;

          if (elapsedTime < this.duration) {
            if (!this.isStop) {
              item.randomText = this._getRandomNum(this.maxNum).toString();

              if (timestamp - delayTimestamp >= this.delay) {
                setTimeout(() => {
                  this._render();
                }, 0);
                delayTimestamp = timestamp;
              }
              requestAnimationFrame(runCount.bind(this));
            }
          } else {
            if (!isDone) {
              // 停止
              this._render(true);
              this._dispatchDoneEvent();
              isDone = true;
            }
          }
        };
        this.singleTextArray[i].timerId = requestAnimationFrame(runCount.bind(this));
      } else {
        this.singleTextArray[i].randomText = text;
      }
    });
  }

  /**
   * 渲染顯示
   */
  private _render(isDone: boolean = false) {
    if (!this.randomModeEnable && this.isPureNum) {
      if (isDone) {
        this.textContent = this.randomModeThousandComma
          ? this._setThousandComma(parseInt(this.counterText))
          : parseInt(this.counterText).toString();
      } else {
        this.textContent = this.randomModeThousandComma
          ? this._setThousandComma(parseInt(this.currentNum.toString()))
          : parseInt(this.currentNum.toString()).toString();
      }
    } else {
      const str = this.singleTextArray
        .map((item) => {
          return isDone ? item.orgText : item.randomText;
        })
        .join('');
      this.textContent = str;
    }
  }

  /**
   * 千分位符號
   */
  private _setThousandComma(num: number): string {
    let comma = /(\d)(?=(\d{3})+(?!\d))/g;
    return num.toString().replace(comma, '$1,');
  }

  /**
   * 取得隨機數字
   */
  private _getRandomNum(maxNum: number): number {
    return Math.floor(Math.random() * maxNum);
  }

  /**
   * 取消動畫
   */
  private _cancelAnimation(stopMethod: boolean = false) {
    if (!this.randomModeEnable && this.isPureNum) {
      if (this.timerId !== null) {
        cancelAnimationFrame(this.timerId);
      }
      if (stopMethod) {
        // 記住當前數字
        this.startNum = this.currentNum;
      }
    } else {
      this.singleTextArray.forEach((item) => {
        if (item.timerId !== null) {
          cancelAnimationFrame(item.timerId);
        }
      });
    }
  }

  /**
   * 觸發 done 事件
   */
  private _dispatchDoneEvent() {
    const doneEvent = new CustomEvent<IWebCountupEventDetail>('web-countup:done', {
      detail: {
        element: this,
        value: this.textContent || '',
      },
      bubbles: true,
      cancelable: true,
    });
    this.dispatchEvent(doneEvent);
  }

  /**
   * 執行計數（帶延遲）
   */
  public run() {
    this.isStop = false;
    // 執行 startTime 延遲
    setTimeout(() => {
      this._runStart();

      const runEvent = new CustomEvent<IWebCountupEventDetail>('web-countup:run', {
        detail: {
          element: this,
          value: this.textContent || '',
        },
        bubbles: true,
        cancelable: true,
      });
      this.dispatchEvent(runEvent);
    }, this.startTime);
  }

  /**
   * 停止計數
   */
  public stop() {
    this._cancelAnimation(true);
    this.isStop = true;

    const stopEvent = new CustomEvent<IWebCountupEventDetail>('web-countup:stop', {
      detail: {
        element: this,
        value: this.textContent || '',
      },
      bubbles: true,
      cancelable: true,
    });
    this.dispatchEvent(stopEvent);
  }

  /**
   * 繼續計數
   */
  public start() {
    // 不執行 startTime 延遲
    this._runStart();
    this.isStop = false;

    const startEvent = new CustomEvent<IWebCountupEventDetail>('web-countup:start', {
      detail: {
        element: this,
        value: this.textContent || '',
      },
      bubbles: true,
      cancelable: true,
    });
    this.dispatchEvent(startEvent);
  }

  /**
   * 重置計數
   */
  public reset() {
    this._cancelAnimation();
    this.isStop = true;
    this.timerId = null;
    this._init();

    const resetEvent = new CustomEvent<IWebCountupEventDetail>('web-countup:reset', {
      detail: {
        element: this,
        value: this.textContent || '',
      },
      bubbles: true,
      cancelable: true,
    });
    this.dispatchEvent(resetEvent);
  }

  /**
   * 重新啟動計數
   */
  public restart() {
    this.reset();
    setTimeout(() => {
      // 執行 startTime 延遲
      this.run();
      this.isStop = false;
    }, this.fps);

    const restartEvent = new CustomEvent<IWebCountupEventDetail>('web-countup:restart', {
      detail: {
        element: this,
        value: this.textContent || '',
      },
      bubbles: true,
      cancelable: true,
    });
    this.dispatchEvent(restartEvent);
  }
}

// 檢查是否已註冊
if (typeof window === 'undefined' || !window.customElements) {
  console.warn('Web Components are not supported in this environment.');
  throw new Error('Web Components are not supported in this environment.');
} else if (!window.customElements.get('web-countup')) {
  customElements.define('web-countup', WebCountup);
}

// 匯出型別定義供使用者使用
export type { IWebCountupEventDetail };
// 匯出類別供外部使用
export { WebCountup };
