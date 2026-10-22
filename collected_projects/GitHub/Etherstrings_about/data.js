// 只改这个文件就能迭代内容。带【】的是待你补充的占位。
window.PROFILE = {
  name: "【名字】",
  handle: "Etherstrings",
  role: "快手 · 研发工程师",
  tagline: "白天在快手扛千万级流量，业余一个人把产品从 0 做到上线收款。",
  strengths: [
    { title: "大流量后端", desc: "千万级流量场景下的稳定性、性能与容量" },
    { title: "一人全栈闭环", desc: "后端 / 网页 / 小程序 / 客户端 / 支付 / 部署" },
    { title: "AI 落地", desc: "模型选型 + 评测门禁 + 接进真实产品" },
  ],
  work: {
    company: "快手",
    title: "【项目名】· 千万级流量",
    points: [
      "我负责：【模块 / 角色，例如核心链路后端 owner】",
      "规模：【DAU / QPS / 峰值，例如 日均千万级请求、峰值 xx 万 QPS】",
      "成果：【一个数字，例如 P99 从 xx ms 降到 xx ms / 可用性 99.99%】",
    ],
  },
  projects: [
    {
      name: "小鱿评蛆团",
      what: "守望先锋玩家评审社区：截图发起评审、扫码投票、随机陪审、出判决分享图",
      fact: "网站 + 微信小程序 + 桌面端，接通微信 / 支付宝收款",
      stack: ["Go", "PostgreSQL", "Redis", "React", "Docker"],
    },
    {
      name: "声音分析「网恋男神/女神」",
      what: "录一段音，分析声线并匹配英雄与参考音色",
      fact: "实测 5 个开源声学模型，预注册评测门禁；声线主判 56/56 命中",
      stack: ["Python", "WavLM", "ECAPA", "PostgreSQL"],
    },
    {
      name: "万我 All is me",
      what: "一张自拍生成多种风格（二次元 / 像素 / 证件照）",
      fact: "一套 monorepo 同时出 网页 + iOS + Android，点数计费",
      stack: ["Cloudflare Workers", "D1", "Next.js", "Expo"],
    },
    {
      name: "投资复盘系统",
      what: "每天自动拉成交、行情、期权数据，按回测过的规则打分出日报",
      fact: "数据层 + 回测引擎 + 仪表盘 + SwiftUI 菜单栏 App",
      stack: ["Python", "回测", "SwiftUI"],
    },
    {
      name: "JVes",
      what: "macOS 菜单栏工具：盯住所有 AI 编程对话，谁在等我、谁跑完了",
      fact: "原生 Swift，接 Claude 自动排优先级、判断项目进度",
      stack: ["Swift", "macOS", "LLM"],
    },
  ],
  more: "还有：A 股 AI 分析推送（开源）、Unity 3D 剧情游戏、多个 AI Agent 技能插件",
  offer: [
    "需要有人把一个想法 2–4 周做成能上线、能收钱的东西",
    "需要有人懂高并发，又能自己把前后端和 AI 都接起来",
  ],
  contact: "github.com/Etherstrings",
};
