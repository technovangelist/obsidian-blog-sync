---
date created: Friday, August 9 2024, 2:05:11 pm
date modified: Sunday, January 5 2025, 6:00:51 pm
description: "TFS_Z (tail free sampling threshold) reduces the influence of low-probability tokens. Values below 1 activate this feature, with lower values being more aggressive at eliminating unlikely choices. Default is 1 (disabled). Not used with Mirostat modes."
---
tfs_z is the tail free sampling threshold. It is ignored if using one of the two mirostat modes. 

it's a sampling method that aims to reduce the impact of low probability tokens, or the tail of the distribution, while maintaining diversity. 

So it helps determine at what point do we ignore the least probable choices for the next token. A value of 1 which is the default disables the setting, but a value less than 1 indicates that tfs is active. The lower the value the more aggressive it is at cutting off the tail.  similar to [[eta]]

#ollama/parameters 