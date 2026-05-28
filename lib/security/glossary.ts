export type GlossaryTerm = {
  term: string;
  zh: string;
  meaning: string;
};

export const glossaryTerms: GlossaryTerm[] = [
  {
    term: "AAD",
    zh: "附加认证数据",
    meaning: "绑定租户、对象、授权与 envelope 上下文，参与 AEAD 校验但不被加密。",
  },
  {
    term: "Capsule",
    zh: "密钥胶囊",
    meaning: "承载被封装的内容密钥材料，代理转换时不能看到明文内容。",
  },
  {
    term: "Grant",
    zh: "授权",
    meaning: "对象级访问策略，包含接收方、动作、过期时间、访问次数和幂等键。",
  },
  {
    term: "Policy Hash",
    zh: "策略哈希",
    meaning: "策略规范化后的摘要；任一策略字段变化都会导致旧证明失效。",
  },
  {
    term: "Policy Bound Proof",
    zh: "策略绑定证明",
    meaning: "证明代理转换绑定了 tenant、dataId、grantId、packageId、keyVersion 和 policyHash。",
  },
  {
    term: "Proof Replay",
    zh: "证明重放",
    meaning: "重复使用同一 proof 的攻击；ReKeyShare 通过 consumed 状态阻止第二次验证。",
  },
  {
    term: "Threshold",
    zh: "门限治理",
    meaning: "将关键授权或转换材料拆分成多个份额，减少单点滥用风险。",
  },
  {
    term: "Transcript",
    zh: "过程记录",
    meaning: "可复核的请求、响应、证明和审计摘要，用于运行审计、故障定位和合规验证。",
  },
];
