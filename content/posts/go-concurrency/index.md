---
title: "Go 语言并发编程实战"
date: 2026-04-15
description: "深入理解 Go 语言的并发模型与 Goroutine，从基础概念到实际应用，带你全面掌握 Go 的并发编程之道"
categories: ["Go"]
tags: ["Go", "并发", "Goroutine"]
---

Go语言的并发模型是其最强大的特性之一，也是 Go 区别于其他编程语言的核心优势。相比传统的线程模型，Go 采用了更轻量级的协程（Goroutine）和高效的调度器，使得并发编程变得更加简单和高效。本文将深入探讨 Goroutine、Channel 和 Select 的使用，帮助你构建高并发的 Go 应用。

## Goroutine 基础

Goroutine 是 Go 语言中的轻量级线程，由 Go 运行时（Runtime）管理。与操作系统线程相比，Goroutine 的创建成本极低（仅需 2KB 栈空间），并且可以在单个 OS 线程上运行数千个 Goroutine。这种设计使得 Go 能够轻松处理百万级别的并发连接。

### 启动 Goroutine

启动一个 Goroutine 非常简单，只需在函数调用前加上 `go` 关键字：

```go
package main

import (
    "fmt"
    "time"
)

func sayHello(name string) {
    for i := 0; i < 3; i++ {
        fmt.Printf("Hello, %s! (%d)\n", name, i)
        time.Sleep(100 * time.Millisecond)
    }
}

func main() {
    // 启动两个 goroutine
    go sayHello("Alice")
    go sayHello("Bob")
    
    // 等待一段时间让 goroutine 完成
    time.Sleep(500 * time.Millisecond)
    fmt.Println("Main function finished")
}
```

### Goroutine 的生命周期

Goroutine 的生命周期管理是并发编程中的重要课题。与 defer 类似，我们可以利用 channel 来等待 Goroutine 完成：

```go
func worker(done chan bool) {
    fmt.Println("Working...")
    time.Sleep(2 * time.Second)
    fmt.Println("Work done")
    done <- true
}

func main() {
    done := make(chan bool, 1)
    go worker(done)
    <-done // 等待 goroutine 完成
}
```

## Channel 通信

Channel 是 Go 中 Goroutine 之间通信的机制，它提供了一种安全、简洁的方式来在协程之间传递数据。

### 基本使用

```go
func worker(id int, jobs <-chan int, results chan<- int) {
    for j := range jobs {
        fmt.Printf("worker %d processing job %d\n", id, j)
        results <- j * 2
    }
}

func main() {
    jobs := make(chan int, 100)
    results := make(chan int, 100)
    
    // 启动 3 个 worker
    for w := 1; w <= 3; w++ {
        go worker(w, jobs, results)
    }
    
    // 发送 9 个任务
    for j := 1; j <= 9; j++ {
        jobs <- j
    }
    close(jobs)
    
    // 收集结果
    for a := 1; a <= 9; a++ {
        <-results
    }
}
```

### Buffered vs Unbuffered Channel

Channel 可以分为有缓冲和无缓冲两种类型：

- **无缓冲 Channel**：发送和接收会阻塞，直到另一方准备好
- **有缓冲 Channel**：在缓冲区满之前不会阻塞

```go
// 无缓冲
ch1 := make(chan int)

// 有缓冲，容量为 10
ch2 := make(chan int, 10)
```

## Select 语句

Select 用于处理多个 Channel 的操作，类似 switch 但作用于 channel：

```go
func main() {
    ch1 := make(chan string)
    ch2 := make(chan string)
    
    go func() {
        time.Sleep(1 * time.Second)
        ch1 <- "one"
    }()
    
    go func() {
        time.Sleep(2 * time.Second)
        ch2 <- "two"
    }()
    
    for i := 0; i < 2; i++ {
        select {
        case msg1 := <-ch1:
            fmt.Println("received:", msg1)
        case msg2 := <-ch2:
            fmt.Println("received:", msg2)
        }
    }
}
```

### 超时处理

结合 `time.After` 可以实现超时控制：

```go
select {
case msg := <-ch:
    fmt.Println("Received:", msg)
case <-time.After(5 * time.Second):
    fmt.Println("Timeout!")
}
```

## 最佳实践

1. **不要共享内存通信，而是通过通信共享内存**
2. **使用 channel 所有的并发操作**
3. **使用 `sync.WaitGroup` 等待一组 goroutine 完成**
4. **合理使用 buffered channel 提高性能**

这就是 Go 并发编程的核心概念。掌握这些，你就能写出高效的并发程序。