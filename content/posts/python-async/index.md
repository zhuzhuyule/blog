---
title: "Python 异步编程完全指南"
date: 2026-04-13
description: "从 asyncio 基础到高级应用，全面解析 Python 异步编程，让 IO 密集型任务性能提升数倍"
categories: ["Python"]
tags: ["Python", "异步", "Asyncio"]
---

Python 的异步编程在 IO 密集型任务中能大幅提升性能。随着 web 应用对高并发需求的增长，异步编程已成为现代 Python 开发不可或缺的技能。本文将带你从基础概念到实际应用，全面掌握 Python 的异步编程。

## 什么是异步编程？

传统的同步编程中，每个 IO 操作都会阻塞程序的执行。当我们需要同时处理多个 IO 密集型任务（如网络请求、文件读写、数据库查询）时，同步方式会导致大量的时间浪费在等待上。

异步编程通过事件循环（Event Loop）机制，允许程序在等待 IO 操作完成时执行其他任务。当一个 IO 操作完成时，程序会被通知继续处理结果。这种方式可以显著提高程序的吞吐量和响应速度。

### 对比：同步 vs 异步

假设我们需要从三个 API 获取数据：

**同步方式**：
```python
import requests
import time

def fetch_all():
    start = time.time()
    r1 = requests.get("https://api.github.com")  # 等待...
    r2 = requests.get("https://httpbin.org/get")  # 等待...
    r3 = requests.get("https://example.com")  # 等待...
    print(f"Total time: {time.time() - start:.2f}s")
```

**异步方式**：
```python
import asyncio
import aiohttp

async def fetch_all():
    start = time.time()
    # 三个请求同时发起
    r1, r2, r3 = await asyncio.gather(
        fetch("https://api.github.com"),
        fetch("https://httpbin.org/get"),
        fetch("https://example.com")
    )
    print(f"Total time: {time.time() - start:.2f}s")
```

在网络延迟为 1 秒的情况下，同步方式需要 3 秒，而异步方式只需要 1 秒。

## 基础：async/await

Python 3.5 引入了 `async/await` 语法，使得异步代码的编写更加清晰。

### 定义异步函数

使用 `async def` 定义的函数称为协程（Coroutine）：

```python
import asyncio

async def fetch_data():
    print("Fetching data...")
    await asyncio.sleep(2)  # 模拟网络请求
    return {"data": "result"}

async def main():
    result = await fetch_data()
    print(f"Got: {result}")

asyncio.run(main())
```

注意：
- `async def` 定义的函数返回的是一个协程对象
- 必须通过 `asyncio.run()` 来运行主协程
- `await` 关键字用于等待协程完成

### await 的作用

`await` 有两个作用：
1. 暂停当前协程的执行
2. 将控制权返回给事件循环，等待另一个协程完成

```python
async def task1():
    print("Task 1 start")
    await asyncio.sleep(1)
    print("Task 1 done")

async def task2():
    print("Task 2 start")
    await asyncio.sleep(0.5)
    print("Task 2 done")

async def main():
    await asyncio.gather(task1(), task2())

asyncio.run(main())
# 输出：
# Task 1 start
# Task 2 start  (task2 在 task1 sleep 时开始)
# Task 2 done
# Task 1 done
```

## 并发执行多个任务

`asyncio.gather()` 允许我们并发执行多个协程：

```python
import asyncio
import aiohttp

async def fetch_url(session, url):
    async with session.get(url) as response:
        return await response.text()

async def main():
    urls = [
        "https://api.github.com",
        "https://httpbin.org/get",
        "https://example.com"
    ]
    
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_url(session, url) for url in urls]
        results = await asyncio.gather(*tasks)
        
    for url, result in zip(urls, results):
        print(f"{url}: {len(result)} bytes")

asyncio.run(main())
```

### asyncio.create_task

`create_task` 用于将协程调度为后台任务：

```python
async def main():
    task1 = asyncio.create_task(some_long_operation())
    task2 = asyncio.create_task(another_operation())
    
    # 等待两个任务完成
    await asyncio.gather(task1, task2)
```

## 异步上下文管理器

异步上下文管理器允许我们在进入和退出时执行异步操作，比如连接和断开数据库：

```python
class AsyncDatabase:
    async def __aenter__(self):
        await self.connect()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.disconnect()
    
    async def connect(self):
        print("Connecting to database...")
        await asyncio.sleep(0.5)
    
    async def disconnect(self):
        print("Disconnecting...")
        await asyncio.sleep(0.1)
    
    async def query(self, sql):
        await asyncio.sleep(0.2)
        return [{"id": 1, "name": "test"}]

async def main():
    async with AsyncDatabase() as db:
        result = await db.query("SELECT * FROM users")
        print(result)

asyncio.run(main())
```

## 异步迭代器与生成器

### 异步迭代器

```python
class AsyncCounter:
    def __init__(self, limit):
        self.limit = limit
        self.current = 0
    
    def __aiter__(self):
        return self
    
    async def __anext__(self):
        if self.current >= self.limit:
            raise StopAsyncIteration
        self.current += 1
        return self.current

async def main():
    async for i in AsyncCounter(5):
        print(i)

asyncio.run(main())
```

### 异步生成器

```python
async def async_range(start, end):
    for i in range(start, end):
        await asyncio.sleep(0.1)
        yield i

async def main():
    async for i in async_range(0, 5):
        print(i)

asyncio.run(main())
```

## 使用 asyncio.Queue

`asyncio.Queue` 提供了协程安全的队列实现：

```python
async def producer(queue, n):
    for i in range(n):
        await queue.put(i)
        print(f"Produced: {i}")
        await asyncio.sleep(0.1)
    await queue.put(None)

async def consumer(queue, name):
    while True:
        item = await queue.get()
        if item is None:
            break
        print(f"{name} consumed: {item}")
        await asyncio.sleep(0.2)

async def main():
    queue = asyncio.Queue()
    
    await asyncio.gather(
        producer(queue, 5),
        consumer(queue, "Consumer-1"),
        consumer(queue, "Consumer-2")
    )

asyncio.run(main())
```

## 错误处理

异步编程中的错误处理需要特别注意：

```python
async def risky_operation():
    await asyncio.sleep(1)
    if random.random() > 0.5:
        raise ValueError("Something went wrong")
    return "Success"

async def main():
    try:
        result = await risky_operation()
    except ValueError as e:
        print(f"Caught error: {e}")
    
    # 使用 shield 保护任务不被取消
    task = asyncio.create_task(important_operation())
    try:
        result = await asyncio.wait_for(task, timeout=5.0)
    except asyncio.TimeoutError:
        print("Task timed out")

asyncio.run(main())
```

## 最佳实践

1. **使用 aiohttp 替代 requests**：aiohttp 是异步 HTTP 客户端
2. **合理使用 gather**：将独立的 IO 操作分组并发执行
3. **设置超时**：使用 `wait_for` 防止协程无限等待
4. **注意连接管理**：使用 async with 确保连接正确关闭
5. **区分 CPU 密集和 IO 密集任务**：CPU 密集任务使用 `run_in_executor`

这就是 Python 异步编程的核心！掌握这些内容，你就能编写高效的异步应用。