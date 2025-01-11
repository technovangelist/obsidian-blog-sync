---
title: eta
description: Eta (learning rate) determines how quickly Mirostat adjusts to changes in model output entropy. Higher rates (>0.1) allow faster adaptation and embrace new writing styles, while lower rates maintain more stable, consistent output by resisting temporary changes.
date: 2024-08-09
updated: 2025-01-06
tags: ["ollama/parameters","notes"]
---

Eta is the learning rate in the context of Mirostat.  Learning rate controls how rapidly Mirostat adapts to changes in the models output entropy. A higher rate means faster adaptation, lower is slower. the default value is 0.1. So if the next word chosen by the model is a strange choice, with a higher eta value, the model will continue to provide words that seem appropriate for this newer style. A low eta is more stable and less likely to overreact to temporary changes. related to [tfs_z](./tfs_z).