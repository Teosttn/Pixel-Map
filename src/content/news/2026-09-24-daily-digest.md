---
type: "daily-digest"
title: "Daily Signals - 2026-09-24"
titleZh: "每日技术资讯 - 2026-09-24"
titleEn: "Daily Signals - 2026-09-24"
date: "2026-09-24"
summaryZh: "今日技术资讯摘要。"
summaryEn: "Today's technology digest."
tags: ["daily-digest", "technology"]
published: true
itemCount: 8
sources: ["Qwen Code Releases", "Hacker News", "OpenAI News", "arXiv cs.AI", "Hugging Face Blog"]
---

## 1. Qwen Code 发布 v0.24.4 夜间构建版本 / Qwen Code Publishes v0.24.4 Nightly Build

中文摘要：本次更新修复了延迟工具桥接导致的文档与核心模块陈旧问题，记录了 CI 测试耗时受模块导入而非调度限制的原因，并将 Agent 工具的提示词编写指引整合为内置技能以提升性能。

English summary: This update fixes stale core and documentation issues caused by the deferred-tool bridge, documents why CI test duration is bounded by module imports rather than scheduling, and moves the Agent tool's prompt-writing guidance into a bundled skill for better performance.

中文短评：夜间版本持续迭代，体现了开源项目对工程细节与性能优化的重视。

English note: The nightly iteration reflects the open-source project's attention to engineering details and performance optimization.

发布：2026-09-23T22:00:39.000Z | 来源：[Qwen Code Releases](https://github.com/QwenLM/qwen-code/releases/tag/v0.24.4-nightly.20260923.d0cd622a68)

## 2. cua-driver-rs v0.20.11 发布预编译二进制 / cua-driver-rs v0.20.11 Releases Prebuilt Binaries

中文摘要：Qwen CUA Driver 提供预编译二进制文件：macOS 版本为已签名并公证的通用二进制及 QwenCuaDriver.app；Linux 版本为未签名的 x86\_64 与 arm64 构建（glibc 2.31 起）；Windows 版本为未签名的 UIAccess worker 与原生 SDK（x86\_64 与 arm64），部署时需由使用方自行签名并信任该 worker。

English summary: Qwen CUA Driver ships prebuilt binaries: macOS offers a codesigned and notarized universal binary plus QwenCuaDriver.app; Linux provides unsigned x86\_64 and arm64 builds with a glibc 2.31 floor; Windows ships an unsigned UIAccess worker and native SDK for x86\_64 and arm64, requiring deployments to sign and trust the worker themselves.

中文短评：跨平台预编译降低了使用门槛，但签名与信任环节仍需部署方自行处理。

English note: Cross-platform prebuilt binaries lower the adoption barrier, though signing and trust remain the deployer's responsibility.

发布：2026-09-23T09:59:34.000Z | 来源：[Qwen Code Releases](https://github.com/QwenLM/qwen-code/releases/tag/cua-driver-rs-v0.20.11)

## 3. Mercury 2.5 大模型推理速度达到每秒 770 个 token / Mercury 2.5 LLM Reaches 770 Tokens per Second

中文摘要：Artificial Analysis 数据显示，Mercury 2.5 模型推理速度达到每秒 770 个 token，该消息在 Hacker News 引发讨论，获得 79 点与 49 条评论。

English summary: Artificial Analysis reports that Mercury 2.5 achieves 770 tokens per second in inference, sparking discussion on Hacker News with 79 points and 49 comments.

中文短评：推理速度是衡量大模型工程化能力的重要指标，Mercury 系列持续在吞吐上发力。

English note: Inference speed is a key metric for LLM engineering, and the Mercury series continues to push throughput boundaries.

发布：2026-09-23T22:16:19.000Z | 来源：[Hacker News](https://artificialanalysis.ai/models/mercury-2-5)

## 4. Ringg 借助 OpenAI 让 AI 客服解决高达 65% 的客户来电 / Ringg Uses OpenAI to Let AI Agents Resolve Up to 65% of Customer Calls

中文摘要：Ringg 基于 GPT-5.6 打造支持语音、聊天、WhatsApp 与网页的多语言 AI 客服，相比 GPT-4.1 成本降低 90%，可解决高达 65% 的客户来电。

English summary: Ringg builds multilingual AI agents across voice, chat, WhatsApp, and the web on GPT-5.6, cutting costs by 90% versus GPT-4.1 and resolving up to 65% of inbound customer calls.

中文短评：新一代模型在客服场景的成本与解决率上带来显著改善，落地价值逐步显现。

English note: The new-generation model delivers notable cost and resolution gains in customer service, with tangible deployment value emerging.

发布：2026-09-23T12:00:00.000Z | 来源：[OpenAI News](https://openai.com/index/ringg)

## 5. 用空间 Transformer 在推理空间中控制 AI 智能体集群 / Controlling Collectives of AI Agents in Reasoning Space with Spatial Transformers

中文摘要：arXiv 论文提出 COMPASS，一种可扩展的去中心化多机器人架构，利用空间 Transformer 在推理空间中控制大规模智能体集群，以应对大语言模型在团队规模增长后难以胜任多机器人任务的问题。

English summary: The arXiv paper proposes COMPASS, a scalable decentralized multi-robot architecture that uses spatial transformers in reasoning space to control large agent collectives, addressing the failure of LLMs on multi-robot tasks as team sizes grow.

中文短评：将空间 Transformer 引入多智能体协作，为机器人群体规划提供了新的可扩展思路。

English note: Introducing spatial transformers to multi-agent coordination offers a new scalable direction for robotic collective planning.

发布：2026-09-24T04:00:00.000Z | 来源：[arXiv cs.AI](https://arxiv.org/abs/2609.28247)

## 6. oMLX 作者 Jun Kim 加入 Hugging Face 支持 MLX 社区 / oMLX Creator Jun Kim Joins Hugging Face to Support the MLX Community

中文摘要：oMLX 项目的创建者与维护者 Jun Kim 正式加入 Hugging Face，将继续支持 Apple MLX 生态社区的发展。

English summary: Jun Kim, the creator and maintainer of oMLX, has officially joined Hugging Face and will continue supporting the Apple MLX ecosystem community.

中文短评：核心维护者加入大平台，有望为 MLX 生态带来更稳定的长期支持。

English note: The core maintainer joining a major platform is expected to bring more stable long-term support to the MLX ecosystem.

发布：2026-09-22T00:00:00.000Z | 来源：[Hugging Face Blog](https://huggingface.co/blog/omlx)

## 7. Harness as a Language：极简但表达力极强的智能体框架 / Harness as a Language: A Minimalist Agent Framework With Maximal Expressivity

中文摘要：arXiv 论文指出，现代语言模型智能体围绕“智能体循环”构建，由 LLM 在暴露一组工具的环境中通过交替调用工具与观察输出来掌控工作流，但某些工作流难以用此范式表达。

English summary: The arXiv paper notes that modern LLM agents are built around an agent loop where the LLM is placed in an environment exposing a set of tools and controls the workflow by alternating tool calls and observations, but certain workflows resist this paradigm.

中文短评：对智能体循环范式的反思，推动框架在极简与表达力之间寻找更优平衡。

English note: Rethinking the agent-loop paradigm pushes frameworks toward a better balance between minimalism and expressivity.

发布：2026-09-24T04:00:00.000Z | 来源：[arXiv cs.AI](https://arxiv.org/abs/2609.26891)

## 8. Airbnb 扩大 GPT-6 Astra 及 OpenAI 前沿模型的使用范围 / Airbnb Expands Access to GPT-6 Astra and OpenAI Frontier Models

中文摘要：Airbnb 正在扩大 GPT-6 Astra 与 OpenAI 前沿模型在工程团队中的使用范围，以帮助工程师修复缺陷、设计系统并更快交付产品。

English summary: Airbnb is expanding access to GPT-6 Astra and OpenAI frontier models across its engineering teams to help engineers fix bugs, design systems, and ship faster.

中文短评：前沿模型正从试点走向工程团队规模化应用，成为研发提效的基础设施。

English note: Frontier models are moving from pilots to scaled engineering adoption, becoming infrastructure for R&D productivity.

发布：2026-09-23T01:00:00.000Z | 来源：[OpenAI News](https://openai.com/index/airbnb-gpt-6-astra)
