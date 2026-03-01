/**
 * Counter 類別 (計數器)
 * 預設跑動方式為: random 隨機模式
 * @param {HTMLElement} 帶入 element
 * @private {NodeList} counters
 * @param {Number} duration（ms）計數動畫的持續時間
 * @param {Number} startTime（ms）開始計數之前的延遲時間
 * @param {Number} delay（ms）每次計數更新之間的延遲時間
 * @param {Number} startNum 起始計數的數字
 * @param {Object} randomMode 是否啟用隨機模式
 * @param {Boolean} randomMode.enable 是否啟用隨機模式，預設 true（計數器內容只要包含非數字的字元，此項設定 false 會無效，一律以隨機模式執行）
 * @param {Boolean} randomMode.thousandComma 是否啟用千分位符號（計數器內容只要包含非數字的字元，此項設定 true 則會無效）
 * @param {Function} done(fn) 計數完成後的回調函數
 * #init() 初始化計數器，設置初始數值並準備啟動計數器
 * stop() 停止計數器的執行，暫停計數動畫
 * start() 啟動計數器，繼續執行計數動畫
 * reset() 重置計數器，將計數器恢復到初始狀態
 * restart() 重新啟動計數器，重置並開始新的計數動畫
 */
export class Counter {
  // 預設設定
  defaultOptions = {
    duration: 1000,
    startTime: 0,
    delay: 0,
    startNum: 0,
    randomMode: {
      enable: true,
      thousandComma: false,
    },
    done: () => {},
  }
  
  #counter;
  #counterText = '';
  #currentNum = null;
  #isPureNum = true; // 是否為純數字
  #timerId = null;
  #singleTextArray = [];
  #maxNum = 9;
  #fps = 60;
  #isStop = false;

  constructor(element, options = {}) {
    // 選填設定
    this.options = { ...this.defaultOptions, ...options };

    this.#addRequired(element);
  }

  #addRequired(element) {
    if (!element || !(element instanceof HTMLElement)) {
      throw new Error('element is not a valid HTMLElement');
    }

    this.#counter = element;
    this.#counterText = this.#counter.textContent;
    this.#isPureNum = Number(this.#counterText) ? true : false;
    this.#addOptional();
  }

  #addOptional() {
    // 設定
    const settings = new Map([
      ['duration', { type: 'number', defaultValue: this.defaultOptions.duration, minValue: 0 }],
      ['startTime', { type: 'number', defaultValue: this.defaultOptions.startTime, minValue: 0 }],
      ['delay', { type: 'number', defaultValue: this.defaultOptions.delay, minValue: 0 }],
      ['startNum', { type: 'number', defaultValue: this.defaultOptions.startNum, minValue: 0 }],
      ['randomMode', { 
        type: 'object', 
        defaultValue: this.defaultOptions.randomMode,
        subSettings: new Map([
          ['enable', { type: 'boolean', defaultValue: this.defaultOptions.randomMode?.enable }],
          ['thousandComma', { type: 'boolean', defaultValue: this.defaultOptions.randomMode?.thousandComma }]
        ])
      }],
      ['done', { type: 'function', defaultValue: this.defaultOptions.done }]
    ]);

    settings.forEach((setting, key) => {
      if (this.options[key] === undefined) {
        this[key] = setting.defaultValue;
        if (key === 'startNum') this.#currentNum = this.startNum;
      } else if (typeof this.options[key] !== setting.type) {
        throw new Error(`${key} is not a ${setting.type} type`);
      } else if (setting.minValue !== undefined && this.options[key] < setting.minValue) {
        this[key] = setting.defaultValue;
        if (key === 'startNum') this.#currentNum = this.startNum;
      }
      else {
        this[key] = this.options[key];
        if (key === 'startNum') this.#currentNum = this.startNum;
      }
  
      if (setting.subSettings) {
        const subOptions = this.options[key] || {};
        this[key] = this[key] || {};
        setting.subSettings.forEach((subSetting, subKey) => {
          if (subOptions[subKey] === undefined) {
            this[key][subKey] = subSetting.defaultValue;
          } else if (typeof subOptions[subKey] !== subSetting.type) {
            throw new Error(`${key}.${subKey} is not a ${subSetting.type} type`);
          } else {
            this[key][subKey] = subOptions[subKey];
          }
        });
      }
    });
  
    // randomMode
    if (this.randomMode.enable && this.randomMode.thousandComma) {
      throw new Error('randomMode thousandComma cannot be used true');
    }
  
    this.#init();
  }
  

  #init() {
    this.#counter.textContent = this.startNum;
  }

  #runStart() {
    if (!this.randomMode.enable && !this.#isPureNum) {
      console.warn('randomMode enable cannot be used false');
    }
    
    // 不啟用 randomMode -> 從 0 開始跑動
    if (!this.randomMode.enable && this.#isPureNum) {
      this.#runSequential(this.startNum === 0 ? parseInt(this.#counterText) : this.startNum);
    } else {
      this.#runRandom();
    }
  }

  #runSequential(diffNum) {
    // console.log('非隨機模式');
    const domNum = parseInt(this.#counterText);
    const diffValue = this.#getDiffValue(diffNum);
    let delayTimestamp = 0;

    const runCount = (timestamp) => {
      const increasmentPerFrame = (domNum - this.startNum) / (this.duration / 16.67);
      this.#currentNum = this.#currentNum + increasmentPerFrame;
      
      if (this.#currentNum < domNum) {
        if (!this.#isStop) {
          if (timestamp - delayTimestamp >= this.delay) {
            this.#render();
            delayTimestamp = timestamp;
          }
          requestAnimationFrame(runCount.bind(this));
        }
      } else {
        this.#render(true);
        this.done();
      }
    }

    if (!this.#timerId) {
      this.#timerId = requestAnimationFrame(runCount.bind(this));
    } else {
      requestAnimationFrame(runCount.bind(this));
    }
  }

  #runRandom() {
    // console.log('隨機模式');
    // 啟用 randomMode -> 拆字 random 跑動
    const domTextArray = this.#counterText.split('');
    let isDone = false;
    let delayTimestamp = 0;

    domTextArray.forEach((text, i) => {
      this.#singleTextArray[i] = {
        timerId: null,
        durationTimestamp: null,
        orgText: text,
        randomText: null,
      };

      if (!isNaN(text)) {
        const runCount = (timestamp) => {
          if (!this.#singleTextArray[i].durationTimestamp) {
            this.#singleTextArray[i].durationTimestamp = timestamp;
          }

          let elapsedTime = timestamp - this.#singleTextArray[i].durationTimestamp;

          if (elapsedTime < this.duration) {
            if (!this.#isStop) {
              this.#singleTextArray[i].randomText = this.#getRandomNum(this.#maxNum);

              if (timestamp - delayTimestamp >= this.delay) {
                setTimeout(() => {
                  this.#render();
                }, 0);
                delayTimestamp = timestamp;
              }
              requestAnimationFrame(runCount.bind(this));
            }

          } else {
            if (!isDone) {
              // 停止
              this.#render(true);
              this.done();
              isDone = true;
            }
          }
        }
        this.#singleTextArray[i].timerId = requestAnimationFrame(runCount.bind(this));
      } else {
        this.#singleTextArray[i].randomText = text;
      }
    })
  }

  #getDiffValue(num) {
    return num / (60 * (this.duration / 1000));
  }

  #render(isDone = false) {
    if (!this.randomMode.enable && this.#isPureNum) {
      if(isDone) {
        this.#counter.textContent = this.randomMode.thousandComma ? this.#setThousandComma(parseInt(this.#counterText)) : parseInt(this.#counterText);
      } else {
        this.#counter.textContent = this.randomMode.thousandComma ? this.#setThousandComma(parseInt(this.#currentNum)) : parseInt(this.#currentNum);
      }
    } else {
      const str = this.#singleTextArray.map((item) => {
        return isDone ? item.orgText : item.randomText;
      }).join('');
      this.#counter.textContent = str;
    }
  }

  // 千分位符號
  #setThousandComma(num) {
    let comma = /(\d)(?=(\d{3})+(?!\d))/g;
    return num.toString().replace(comma, '$1,');
  }

  #getRandomNum(maxNum) {
    return Math.floor(Math.random() * maxNum);
  }

  #cancelAnimation(stopMethod = false) {
    if (!this.randomMode.enable && this.#isPureNum) {
      cancelAnimationFrame(this.#timerId);
      if (stopMethod) {
        // 記住當前數字
        this.startNum = this.#currentNum;
      }
    } else {
      this.#singleTextArray.forEach((item) => {
        cancelAnimationFrame(item.timerId);
      })
    }
  }

  run() {
    this.#isStop = false;
    // 執行 startTime 延遲
    setTimeout(() => {
      this.#runStart();
    }, this.startTime);
  }

  stop() {
    this.#cancelAnimation(true);
    this.#isStop = true;

    console.log('stop');
  }

  start() {
    // 不執行 startTime 延遲
    this.#runStart();
    this.#isStop = false;

    console.log('start');
  }

  reset() {
    this.#cancelAnimation();
    this.#isStop = true;
    this.#timerId = null;
    this.#addOptional();

    console.log('reset');
  }

  restart() {
    this.reset();
    setTimeout(() => {
      // 執行 startTime 延遲
      this.run();
      this.#isStop = false;
    }, this.#fps);

    console.log('restart');
  }
}