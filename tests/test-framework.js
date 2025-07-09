// Simple Test Framework for Chrome Extension
// シンプルなテストフレームワーク（外部依存なし）

class TestFramework {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      total: 0
    };
    this.currentSuite = null;
  }

  // テストスイートの開始
  describe(suiteName, callback) {
    this.currentSuite = suiteName;
    console.log(`\n=== ${suiteName} ===`);
    callback();
    this.currentSuite = null;
  }

  // 個別テストの実行
  it(testName, callback) {
    const fullName = this.currentSuite ? `${this.currentSuite}: ${testName}` : testName;
    
    try {
      callback();
      this.results.passed++;
      console.log(`✅ ${fullName}`);
    } catch (error) {
      this.results.failed++;
      console.error(`❌ ${fullName}`);
      console.error(`   Error: ${error.message}`);
      if (error.stack) {
        console.error(`   Stack: ${error.stack}`);
      }
    }
    
    this.results.total++;
  }

  // アサーション関数
  expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, but got ${actual}`);
        }
      },
      
      toEqual: (expected) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
        }
      },
      
      toBeUndefined: () => {
        if (actual !== undefined) {
          throw new Error(`Expected undefined, but got ${actual}`);
        }
      },
      
      toBeNull: () => {
        if (actual !== null) {
          throw new Error(`Expected null, but got ${actual}`);
        }
      },
      
      toBeTruthy: () => {
        if (!actual) {
          throw new Error(`Expected truthy value, but got ${actual}`);
        }
      },
      
      toBeFalsy: () => {
        if (actual) {
          throw new Error(`Expected falsy value, but got ${actual}`);
        }
      },
      
      toContain: (expected) => {
        if (!actual.includes(expected)) {
          throw new Error(`Expected ${actual} to contain ${expected}`);
        }
      },
      
      toHaveLength: (expectedLength) => {
        if (actual.length !== expectedLength) {
          throw new Error(`Expected length ${expectedLength}, but got ${actual.length}`);
        }
      },
      
      toThrow: (expectedError) => {
        try {
          actual();
          throw new Error(`Expected function to throw, but it didn't`);
        } catch (error) {
          if (expectedError && !error.message.includes(expectedError)) {
            throw new Error(`Expected error containing "${expectedError}", but got "${error.message}"`);
          }
        }
      },
      
      toBeInstanceOf: (expectedClass) => {
        if (!(actual instanceof expectedClass)) {
          throw new Error(`Expected instance of ${expectedClass.name}, but got ${actual.constructor.name}`);
        }
      },
      
      toMatch: (pattern) => {
        if (!pattern.test(actual)) {
          throw new Error(`Expected ${actual} to match pattern ${pattern}`);
        }
      },
      
      toBeGreaterThan: (expected) => {
        if (actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      },
      
      toBeLessThan: (expected) => {
        if (actual >= expected) {
          throw new Error(`Expected ${actual} to be less than ${expected}`);
        }
      }
    };
  }

  // 非同期テスト用
  async expectAsync(asyncFunction) {
    try {
      const result = await asyncFunction();
      return this.expect(result);
    } catch (error) {
      return {
        toReject: (expectedError) => {
          if (expectedError && !error.message.includes(expectedError)) {
            throw new Error(`Expected error containing "${expectedError}", but got "${error.message}"`);
          }
        }
      };
    }
  }

  // 結果の表示
  showResults() {
    console.log(`\n=== Test Results ===`);
    console.log(`Total: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    
    if (this.results.failed === 0) {
      console.log(`🎉 All tests passed!`);
    } else {
      console.log(`💥 ${this.results.failed} test(s) failed`);
    }
    
    return this.results.failed === 0;
  }

  // テストの実行
  run() {
    console.log('🧪 Running tests...');
    // テストは describe/it の中で既に実行されているので
    // 結果を表示するだけ
    return this.showResults();
  }
}

// モック用のヘルパー関数
class MockHelper {
  // ファイルオブジェクトのモック
  createMockFile(content, filename = 'test.csv', mimeType = 'text/csv') {
    const blob = new Blob([content], { type: mimeType });
    const file = new File([blob], filename, { type: mimeType });
    return file;
  }

  // FileReader のモック
  createMockFileReader(content, shouldFail = false) {
    return {
      readAsText: function(file, encoding) {
        setTimeout(() => {
          if (shouldFail) {
            this.onerror && this.onerror(new Error('Mock file read error'));
          } else {
            this.onload && this.onload({ target: { result: content } });
          }
        }, 0);
      }
    };
  }

  // DOM要素のモック
  createMockElement(tagName, attributes = {}) {
    const element = {
      tagName: tagName.toUpperCase(),
      style: {},
      addEventListener: () => {},
      removeEventListener: () => {},
      click: () => {},
      setAttribute: (name, value) => {
        element[name] = value;
      },
      getAttribute: (name) => {
        return element[name];
      }
    };

    Object.assign(element, attributes);
    return element;
  }

  // document のモック
  createMockDocument() {
    const elements = {};
    
    return {
      createElement: (tagName) => {
        return this.createMockElement(tagName);
      },
      
      getElementById: (id) => {
        return elements[id] || null;
      },
      
      body: {
        appendChild: () => {},
        removeChild: () => {}
      },
      
      head: {
        appendChild: () => {}
      },
      
      // テスト用の要素登録
      _registerElement: (id, element) => {
        elements[id] = element;
      }
    };
  }

  // URL のモック
  createMockURL() {
    const urls = new Map();
    
    return {
      createObjectURL: (blob) => {
        const url = 'blob:mock-url-' + Date.now();
        urls.set(url, blob);
        return url;
      },
      
      revokeObjectURL: (url) => {
        urls.delete(url);
      },
      
      _getBlob: (url) => {
        return urls.get(url);
      }
    };
  }
}

// グローバルに公開
if (typeof window !== 'undefined') {
  window.TestFramework = TestFramework;
  window.MockHelper = MockHelper;
} else if (typeof module !== 'undefined') {
  module.exports = { TestFramework, MockHelper };
}