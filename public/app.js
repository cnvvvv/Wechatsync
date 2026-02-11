// 全局变量
let isDownloading = false;

// DOM 加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
  // 初始化 FAQ 手风琴效果
  initFAQ();

  // 平滑滚动到锚点
  initSmoothScroll();

  // 添加滚动时的头部效果
  initScrollEffects();
});

// FAQ 手风琴效果
function initFAQ() {
  const faqQuestions = document.querySelectorAll('.faq-question');

  faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
      const faqItem = question.parentElement;
      const isActive = faqItem.classList.contains('active');

      // 关闭所有其他 FAQ 项
      document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
      });

      // 切换当前项
      if (!isActive) {
        faqItem.classList.add('active');
      }
    });
  });
}

// 平滑滚动
function initSmoothScroll() {
  const navLinks = document.querySelectorAll('.nav-link');
  const downloadButton = document.querySelector('.btn-primary[href="#download"]');

  // 导航链接点击事件
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href');
      const targetElement = document.querySelector(targetId);

      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // 下载按钮点击事件
  if (downloadButton) {
    downloadButton.addEventListener('click', (e) => {
      e.preventDefault();
      downloadExtension();
    });
  }
}

// 滚动效果
function initScrollEffects() {
  const header = document.querySelector('.header');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    // 向下滚动时隐藏头部
    if (currentScroll > lastScroll && currentScroll > 100) {
      header.style.transform = 'translateY(-100%)';
    } else {
      header.style.transform = 'translateY(0)';
    }

    lastScroll = currentScroll;
  });
}

// 下载扩展
function downloadExtension() {
  if (isDownloading) return;

  isDownloading = true;

  // 创建下载提示
  const downloadButton = document.querySelector('.btn-primary[href="#download"]');
  const originalText = downloadButton.innerHTML;

  downloadButton.innerHTML = `
    <svg class="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-25"></circle>
      <path fill="currentColor" class="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    下载中...
  `;
  downloadButton.disabled = true;

  // 模拟下载过程
  setTimeout(() => {
    // 实际项目中这里应该是真实的下载链接
    // window.location.href = '/downloads/wechatsync-extension.zip';

    // 这里只是一个示例
    alert('下载即将开始...\n\n请检查您的下载文件夹。\n\n如果您是从 Chrome 应用商店下载，请访问：https://chrome.google.com/webstore/detail/wechatsync');

    // 恢复按钮
    downloadButton.innerHTML = originalText;
    downloadButton.disabled = false;
    isDownloading = false;
  }, 1500);
}

// 添加滚动时的动画效果
function addScrollAnimation() {
  const elements = document.querySelectorAll('.feature-card, .testimonial-card');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, {
    threshold: 0.1
  });

  elements.forEach(element => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(element);
  });
}

// 初始化所有动画
addScrollAnimation();

// 表单验证（如果以后需要添加表单）
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// 复制文本到剪贴板
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('已复制到剪贴板！');
  }).catch(err => {
    console.error('复制失败:', err);
  });
}

// 添加页面加载完成后的欢迎消息
window.addEventListener('load', () => {
  console.log('欢迎使用微信公众号同步助手！');

  // 可以在这里添加其他初始化代码
  // 例如：检查用户是否已安装扩展等
});

// 添加键盘快捷键支持
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + K 聚焦搜索（如果以后添加搜索功能）
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    // 搜索功能的实现
  }

  // ESC 关闭所有打开的 FAQ
  if (e.key === 'Escape') {
    document.querySelectorAll('.faq-item.active').forEach(item => {
      item.classList.remove('active');
    });
  }
});

// 性能优化：延迟加载图片
if ('IntersectionObserver' in window) {
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        imageObserver.unobserve(img);
      }
    });
  });

  document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
  });
}

// 移动端菜单切换（如果以后需要添加移动端菜单）
function toggleMobileMenu() {
  const mobileMenu = document.querySelector('.mobile-menu');
  if (mobileMenu) {
    mobileMenu.classList.toggle('active');
  }
}

// 添加页面可见性变化处理
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // 页面隐藏时可以暂停某些操作
    console.log('页面已隐藏');
  } else {
    // 页面显示时可以恢复操作
    console.log('页面已显示');
  }
});

// 错误处理
window.addEventListener('error', (e) => {
  console.error('页面错误:', e.error);
});

// 添加一个简单的主题切换功能（如果需要）
function toggleTheme() {
  document.body.classList.toggle('dark-theme');
  localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

// 检查用户之前的主题偏好
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark-theme');
}

// 添加数字动画效果
function animateNumbers() {
  const numbers = document.querySelectorAll('.animate-number');

  numbers.forEach(num => {
    const target = parseInt(num.textContent);
    const increment = target / 100;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      num.textContent = Math.floor(current);
    }, 20);
  });
}

// 当包含数字的元素进入视口时触发动画
const numberObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateNumbers();
      numberObserver.unobserve(entry.target);
    }
  });
});

// 监听所有包含数字的元素
document.querySelectorAll('.animate-number').forEach(el => {
  numberObserver.observe(el);
});