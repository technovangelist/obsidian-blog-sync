---
title: 19 Tips to Better AI Fine Tuning
description: 
date: 2024-01-10
updated: 2025-01-10
tags: ["videos"]
---

Hey everyone! Check this out. Here's a Llama 3.1 model trying to answer a simple question about Ollama. It really has no idea what Ollama is. Now watch what happens when I ask the same question to a model fine-tuned on Ollama documentation. Notice the difference? That's the power of fine-tuning, and today I'm going to show you exactly what it is, when you should use it, and how to prepare for it.



Let's clear up the biggest misconception about fine-tuning right away: it's not usually about teaching the model new information. RAG is a better technique for that particular need. Thats because the model already has vast knowledge - what fine-tuning normally does is help it focus and better utilize what it already knows.

Think of it like this: your base model is like a general practitioner who's read every medical textbook but speaks in general terms. Fine-tuning is like teaching that doctor to focus on specific details and communicate more precisely about particular conditions. We're not adding new medical knowledge, though some may creep in there - we're refining how they use their existing expertise.

This distinction is crucial because it helps you understand when fine-tuning makes sense and when it doesn't. If you need knowledge that's not in the base model, fine-tuning is only going to minimally help. But if you need the model to better focus on and articulate existing knowledge? That's where fine-tuning shines.



Before we dive deeper, make sure you hit subscribe and turn on notifications. I've got a whole series coming up showing you how to implement fine-tuning with different tools like Axolotl, unsloth, and MLX. Each has its own advantages, and we'll explore them all. Drop a comment below with which tool you're most interested in learning about first!



Now that we understand fine-tuning isn't about adding new knowledge, let's talk about how it actually works. When you're writing prompts, you're essentially giving the model instructions at runtime - like leaving a note for someone to follow. Fine-tuning, on the other hand, is like adjusting the model's internal compass - teaching it to naturally lean toward certain patterns and styles of response.

Let's break down the main approaches to fine-tuning. First, there's full fine-tuning. This is where we adjust all of the model's parameters. Think of it like sending the model back to school for a complete retraining. It's incredibly powerful, but there's a catch - you need serious computational resources. We're talking multiple GPUs and potentially days or weeks of training time. Most of us don't have that kind of hardware lying around.

That's where LoRA comes in - Low-Rank Adaptation. Instead of adjusting everything, LoRA modifies a smaller set of parameters. It's like giving the model targeted training in specific areas rather than a complete overhaul. The results can be nearly as good as full fine-tuning, but at a fraction of the computational cost. This is what most people should be using for their fine-tuning projects.

Then there's QLoRA - Quantized LoRA. This takes things a step further by making the process even more efficient. It uses clever math tricks to reduce the memory requirements while maintaining quality. If you're working on a lower end GPU or even a good CPU, this might be your best option.

But here's something crucial about all these methods - they're not about teaching the model new facts. Instead, they're about training the model to recognize patterns in how information should be presented. It's like teaching someone who knows multiple languages to consistently use one specific language and style.

Let me give you a concrete example. Say you're fine-tuning a model for API documentation. The model already knows about APIs, HTTP methods, and how to write documentation. What fine-tuning does is teach it to consistently format this information in your preferred style, use your specific terminology, and focus on the aspects that matter most to your users.

This is why the quality of your training data is so critical - but we'll get to that in a minute.

Before we move on, let's quickly cover some parameters you'll encounter in every fine-tuning project. Think of these as the universal controls you'll need to understand, no matter which tool you choose.

Learning rate is like the size of steps your model takes while learning. Too big, and it might overshoot the best solution - like trying to parallel park at 60 mph. Too small, and training takes forever. Finding the right learning rate is crucial for successful fine-tuning.

Batch size determines how many examples your model looks at before updating its knowledge. Larger batches give more stable learning but need more memory. It's like the difference between adjusting your cooking based on one taste versus trying a whole plateful.

Number of epochs is how many times your model will see the entire dataset. Too few, and it might not learn the patterns. Too many, and you risk overfitting - remember our Star Wars quotes example? You'll need to find the sweet spot.

Then there's optimizer selection - think of this as choosing between different teaching methods. Some optimizers like AdamW are great all-rounders, while others might work better for specific cases.

Now that we understand how fine-tuning works under the hood, let's tackle the most important question: when should you actually use it? Because while fine-tuning is powerful, it's not always the right tool for the job.



Let's look at the scenarios where fine-tuning really shines, and more importantly, when you should avoid it completely.

The first perfect use case is domain adaptation. Let's say you're working with kubernetes. The base model knows about kubernetes - it understands pods, deployments, and services. But maybe it explains things too generally, or it doesn't consistently use the terminology your team prefers. Fine-tuning can teach it to be more precise, to always reference the official kubernetes patterns, and to give examples that actually make sense in real-world scenarios.

The second major use case is style matching. This is huge for maintaining consistency across documentation or customer support. Imagine you have a specific way of writing API documentation - maybe you always want parameters explained in a certain order, or specific formatting for code examples. Fine-tuning can make the model naturally follow these patterns without having to spell it out in every prompt.

But here's where people often waste time trying to fine-tune when they shouldn't. First scenario: you just need the model to respond in a specific way occasionally. That's what prompt engineering is for - don't bring a bulldozer when you just need a shovel.

Second trap: trying to teach the model new, current information. Remember what we said earlier - fine-tuning can't add new knowledge. If you need the model to know about a framework that was released last month, fine-tuning won't reliably help. You'll need to either wait for new base models or use retrieval augmented generation - which we have covered in another video.

The third mistake I see all the time is trying to fine-tune with too little data. If you only have 10 or 20 examples, something dangerous happens called overfitting. Think of it like this: imagine teaching someone English using only Star Wars quotes. They might perfectly learn those specific quotes, but they won't understand English in general. In fact, they might start trying to force Star Wars references into every conversation, even when it makes no sense.

That's exactly what happens when you fine-tune with too little data - the model becomes too specialized in your few examples and loses its ability to generalize. It might give perfect responses for situations exactly like your training data, but it becomes worse at everything else. You need enough diverse examples to teach patterns, not memorization. That overspecialization is called overfitting. 

And here's a bonus tip: sometimes the best use case is combining these approaches. Maybe you're fine-tuning for both domain expertise AND style in your technical documentation. That's perfectly fine - but this brings us to the most critical part of any fine-tuning project: your training data.



You see, your fine-tuned model will only be as good as the data you train it on. This is where most projects either succeed spectacularly or fail miserably. Your model will only be as good as your training data, so let's talk about finding that sweet spot between quality and quantity.

Remember how we talked about overfitting with too little data? That's still a real concern. You need enough examples to teach patterns rather than memorization. In my experience, you want at least a few hundred examples to start seeing good results. But here's where it gets interesting - more data isn't always better.

I've actually seen better results from 1000 high-quality examples than 10000 mediocre ones. Why? Because consistency matters more than raw numbers. Your data needs to be like a great teacher - clear, consistent, and focused on what you actually want the model to learn.

Here's a mistake I see all the time: people dump their entire documentation database into the training set. They think "more is better" and throw everything they have at the model. Don't do this! It's like trying to teach someone to cook by having them read every cookbook ever written. Instead, carefully select examples that represent exactly what you want the model to learn.

Let's talk about what makes training data "high quality". First, it needs to be consistent in format and style. If half your examples use formal language and half are casual, you're just confusing the model. Second, it needs to be free of errors and contradictions. The model will learn your mistakes just as easily as your good practices. And third, every example should be relevant to your specific use case.

Format is crucial too. While we'll dive deep into specific formats in our implementation tutorials, here's what you need to know: every training example needs a clear input (what you'll ask the model), a clear output (how you want it to respond), and optionally some context or system prompts to set the stage.

Here's something many people miss: include edge cases and failure scenarios in your training data. If you're training a model to help with code, include examples of how to handle errors gracefully. If you're training for customer support, include examples of how to handle unclear or impossible requests. This helps the model understand its boundaries and limitations.

Think of your training data like teaching a new employee. You want enough examples to cover the common cases, the edge cases, and everything in between. But even the best training data won't help if you're starting with the wrong foundation. This brings us to another crucial decision: choosing your base model.



Just like how different students learn differently, each base model comes with its own characteristics and requirements. Let's talk about how to choose the right one for your project. Think of it like picking the foundation for a house. You can have the best building materials in the world, but if your foundation isn't right, nothing else matters.

First, let's talk about model size. Bigger models like llama2-70b are incredibly powerful - they understand context better, make fewer mistakes, and generally give more nuanced responses. But there's a huge catch: they're resource hungry monsters. You'll need serious GPU power just to run them, let alone fine-tune them. We're talking multiple high-end GPUs and potentially thousands in cloud computing costs.

This is where smaller models like llama2-7b shine. Sure, they might not be quite as sophisticated as their larger siblings, but here's the thing - they're often more than adequate for most fine-tuning projects. They're faster to train, cheaper to run, and more practical for real-world applications. Think of it like this: you don't need a semi-truck to deliver a pizza.

Now, let's talk about a critical aspect that many people overlook: licensing. This isn't just legal bureaucracy - it can make or break your project. Some models have strict commercial restrictions. Others require attribution. Some are fully open source. If you're building something commercial, you need to be especially careful here. The last thing you want is to spend months fine-tuning a model you can't legally use.

For most of you using Ollama, here's my practical recommendation: start with llama2-7b. It's like the Toyota Corolla of language models - reliable, efficient, and gets the job done. Once you've got your fine-tuning pipeline working, you can experiment with mistral-7b, which often gives better performance for similar resource costs. And if you need something more general purpose, neural-chat is a solid choice.

Remember - you can always switch models later. It's better to start with something manageable and learn the process than to get stuck trying to fine-tune a model that's too large for your hardware.



So now you understand what fine-tuning is, when to use it, how to prepare your data, and which model to start with. But you might be thinking, "Great, but how do I actually DO this?" That's exactly what we're covering in our upcoming series.

We'll be looking at three powerful tools that make fine-tuning accessible. First up is Axolotl - it's like the Swiss Army knife of fine-tuning tools. It gives you incredible control over the process and supports pretty much every modern fine-tuning technique. If you want to really understand what's happening under the hood, this is where we'll start.

Then we'll look at unsloth. The name tells you exactly what it does - it makes fine-tuning fast. Really fast. If you're working with limited compute resources or just don't want to wait days for your model to train, you're going to love this one. The downside is that if you have a few GPU's unsloth will just use the first one.

For our Mac users, especially those with Apple Silicon, we'll be revisiting MLX. Some of you might have caught my previous MLX video - actually, it's become one of my most popular videos ever! But for this series, we're going to do a fresh take on it. Apple's machine learning framework is incredibly efficient on Mac hardware, and I'll show you how to leverage it for fine-tuning without needing anything beyond your Apple Silicon Mac.

Each of these tools has its own superpower, and by the end of this series, you'll know exactly which one fits your needs. Plus, everything we create will be compatible with Ollama, so you can easily deploy your fine-tuned models.

Before you go, make sure to hit that subscribe button and join our Discord community. You can share your experiences and get help when you need it.

Drop a comment below letting me know which tool you want to see first - Axolotl, unsloth, or MLX, or maybe another tool too. Your feedback will help me prioritize the upcoming tutorials.

Remember: fine-tuning isn't magic - it's a powerful tool that, when used correctly, can help models better utilize their existing knowledge. Start with good data, choose the right base model, and stay tuned for the practical tutorials where we'll put everything we learned today into action.

Thanks for watching, and I'll see you in the next one!