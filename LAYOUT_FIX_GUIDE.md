# SCXML 状态图遮挡问题修复方案

## 📋 问题概述

原始问题：自动生成的SCXML状态图存在严重的遮挡问题
- 节点文字被其他节点和连线遮挡
- 标签密密麻麻地挤在一起
- 容器内的子节点重叠严重
- 整体可读性极差

## 🔍 根本原因分析

### 1. **间距配置严重不足**
原配置使用的间距太小，无法为复杂的状态图提供足够的空间：
- 节点间距仅80像素
- 层间距仅150像素
- 边缘到节点距离仅50像素

### 2. **缺少ELK防遮挡选项**
代码中完全没有启用ELK布局引擎的以下关键特性：
- 重叠检测和处理
- 高级节点放置算法
- 标签防重叠机制
- 交叉最小化策略

### 3. **标签尺寸计算不准确**
边缘标签的padding太小（仅16像素），导致：
- 标签与连线重叠
- 标签之间距离过近
- 文字可能被裁切

### 4. **容器节点空间不足**
容器节点的padding设置太小，导致子节点被挤压在一起

## ✅ 完整修复方案

### 修复1: elkGraph.ts - 大幅优化布局配置

#### 间距优化
```typescript
'elk.spacing.nodeNode': '120'                    // 80 → 120 (+50%)
'elk.spacing.nodeNodeBetweenLayers': '200'       // 150 → 200 (+33%)
'elk.spacing.edgeEdge': '60'                     // 40 → 60 (+50%)
'elk.spacing.edgeNode': '80'                     // 50 → 80 (+60%)
```

#### 新增防遮挡选项
```typescript
// 标签间距控制
'elk.spacing.edgeLabel': '30'
'elk.spacing.labelLabel': '20'
'elk.spacing.componentComponent': '100'

// 高级节点放置算法
'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX'
'elk.layered.spacing.nodeNodeBetweenLayers': '200'

// 标签防重叠
'elk.edgeLabels.inline': 'false'
'elk.edgeLabels.placement': 'CENTER'

// 交叉最小化
'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP'
```

#### 边缘标签尺寸优化
```typescript
width: Math.max(60, measureText(labelText, 12, 500) + 40)  // padding: 16 → 40
height: 24  // 20 → 24
```

### 修复2: measure.ts - 优化节点尺寸

#### 基础尺寸增加
```typescript
BASE_WIDTH: 160 → 200       (+25%)
BASE_HEIGHT: 64 → 72        (+12.5%)
HEADER_HEIGHT: 36 → 40      (+11%)
LABEL_LEFT: 16 → 20         (+25%)
LABEL_RIGHT: 20 → 24        (+20%)
BODY_PADDING_X: 22 → 28     (+27%)
BODY_PADDING_Y: 16 → 20     (+25%)
```

#### 圆形节点尺寸增加
```typescript
initial: 28 → 32            (+14%)
final: 40 → 48              (+20%)
history: 32 → 40            (+25%)
圆形节点padding: 8 → 12     (+50%)
```

#### 容器节点优化
```typescript
// 初始高度
height: HEADER_HEIGHT → HEADER_HEIGHT + 60

// padding全面增加
top: HEADER_HEIGHT + 24 → HEADER_HEIGHT + 32
right: 24 → 32
bottom: 24 → 32
left: 24 → 32
```

## 🎯 效果预期

修复后应该实现：

### ✨ 视觉改善
1. **完全消除遮挡**：节点、标签、连线之间有充足的间距
2. **清晰的层次结构**：容器和子节点层次分明
3. **可读性大幅提升**：所有文字和标签都清晰可见

### 📐 布局改善
1. **更合理的空间分配**：ELK算法有更多空间进行优化
2. **更少的交叉**：连线交叉最小化策略生效
3. **更好的对齐**：高级节点放置算法提供更美观的布局

### ⚠️ 权衡考虑
- **图的整体尺寸会变大**：这是必要的代价，因为需要更多空间避免遮挡
- **可能需要更多缩放操作**：用户可能需要使用缩放功能来查看完整图形
- **布局计算可能稍慢**：使用了更复杂的算法，但在现代浏览器中差异不明显

## 🔧 如何验证修复效果

1. **重新加载应用**：刷新浏览器或重启开发服务器
2. **输入相同的SCXML代码**：使用之前产生遮挡的代码
3. **观察改善**：
   - 检查节点之间是否有足够间距
   - 确认标签是否清晰可见
   - 验证容器内的子节点是否分散合理
4. **测试不同规模的图**：
   - 简单图（3-5个节点）
   - 中等复杂度图（10-20个节点）
   - 复杂图（20+个节点）

## 📝 后续优化建议

如果遮挡问题仍然存在，可以考虑：

### 进一步增加间距
```typescript
'elk.spacing.nodeNode': '120' → '150'
'elk.spacing.nodeNodeBetweenLayers': '200' → '250'
```

### 启用更多ELK高级功能
```typescript
'elk.layered.thoroughness': '100'  // 提高布局质量
'elk.layered.nodePlacement.favorStraightEdges': 'true'  // 优先直线边缘
```

### 动态调整策略
根据节点数量动态调整间距：
- 节点少（<10）：保持当前配置
- 节点中（10-30）：增加20%间距
- 节点多（>30）：增加40%间距

## 📚 相关资源

- [ELK官方文档](https://www.eclipse.org/elk/reference.html)
- [ELK Layered算法选项](https://www.eclipse.org/elk/reference/algorithms/org-eclipse-elk-layered.html)
- [elkjs GitHub仓库](https://github.com/kieler/elkjs)

---

**修复完成时间**: 2025-12-16
**修复文件**:
- `src/diagram/elkGraph.ts`
- `src/diagram/measure.ts`
