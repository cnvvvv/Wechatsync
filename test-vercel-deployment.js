/**
 * Vercel 部署测试脚本
 */

const DEPLOYMENT_URL = 'https://wechatsync-v2.vercel.app';

// 测试用例
const tests = [
  {
    name: '健康检查',
    method: 'GET',
    path: '/api/health',
    expected: (res) => res.status === 200 && res.data.status === 'ok'
  },
  {
    name: 'API 状态',
    method: 'GET',
    path: '/api/mcp',
    expected: (res) => res.status === 200
  },
  {
    name: '平台列表',
    method: 'GET',
    path: '/api/mcp/platforms',
    expected: (res) => res.status === 200 && res.data.success === true
  }
];

// 发送 HTTP 请求
async function request(method, path, body = null) {
  const url = `${DEPLOYMENT_URL}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.text();
    let parsedData;

    try {
      parsedData = JSON.parse(data);
    } catch (e) {
      parsedData = data;
    }

    return {
      status: response.status,
      data: parsedData,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return {
      status: 0,
      error: error.message,
      ok: false
    };
  }
}

// 运行测试
async function runTests() {
  console.log('🚀 开始测试 Vercel 部署...\n');
  console.log(`测试 URL: ${DEPLOYMENT_URL}\n`);

  const results = [];

  for (const test of tests) {
    console.log(`📝 测试: ${test.name}`);

    try {
      const response = await request(test.method, test.path, test.body);

      if (test.expected(response)) {
        console.log('  ✅ 通过');
        results.push({ name: test.name, status: 'pass' });
      } else {
        console.log('  ❌ 失败');
        console.log('  响应:', response);
        results.push({ name: test.name, status: 'fail', response });
      }
    } catch (error) {
      console.log('  ❌ 错误:', error.message);
      results.push({ name: test.name, status: 'error', error: error.message });
    }

    console.log('');
  }

  // 输出总结
  const passed = results.filter(r => r.status === 'pass').length;
  const total = results.length;

  console.log('📊 测试总结:');
  console.log(`通过: ${passed}/${total}`);

  if (passed === total) {
    console.log('🎉 所有测试通过！部署成功！');
  } else {
    console.log('⚠️  部分测试失败，请检查部署配置');

    // 显示失败的测试
    results.filter(r => r.status !== 'pass').forEach(r => {
      console.log(`- ${r.name}: ${r.error || '失败'}`);
    });
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, request };