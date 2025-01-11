---
date created: Friday, August 9 2024, 1:06:22 pm
date modified: Sunday, January 5 2025, 6:00:47 pm
description: "Eta (learning rate) determines how quickly Mirostat adjusts to changes in model output entropy. Higher rates (>0.1) allow faster adaptation and embrace new writing styles, while lower rates maintain more stable, consistent output by resisting temporary changes."
---
Eta is the learning rate in the context of Mirostat.  Learning rate controls how rapidly Mirostat adapts to changes in the models output entropy. A higher rate means faster adaptation, lower is slower. the default value is 0.1. So if the next word chosen by the model is a strange choice, with a higher eta value, the model will continue to provide words that seem appropriate for this newer style. A low eta is more stable and less likely to overreact to temporary changes. related to [[tfs_z]].

#ollama/parameters 