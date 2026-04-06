# 🧠 Behavior Tree Designer

A professional, web-based visual editor for designing and exporting Behavior Trees (BT). Built with **React Flow** and **Tailwind CSS**, this tool is designed for game developers and AI enthusiasts who need a clean, intuitive interface to map out complex logic.

🚀 **[Live Demo](https://ardabo1.github.io/behavior-tree-designer)**

---

## ✨ Features

- **Drag & Drop Interface:** Easily add nodes from the library to the canvas.
- **Visual Logic Hierarchy:** Distinct shapes for different node types (Composites, Decorators, Leaves).
- **Lasso Selection:** Select multiple nodes by holding `Shift` and dragging with the left mouse button.
- **Node Inspector:** A dedicated panel to customize node colors and edit properties globally.
- **Smart Connections:** Logic-aware connection rules (e.g., Leaf nodes cannot have children).
- **JSON Export:** One-click export to get a nested JSON structure ready for your game engine.
- **Dark Mode Aesthetic:** Deep dark blue theme optimized for long dev sessions.

---

## 🛠️ Node Types

| Type | Shape | Function |
| :--- | :--- | :--- |
| **Composites** | Rectangular | `Sequence` and `Selector` logic flows. |
| **Decorators** | Chamfered | `Inverter` or `Repeater` logic modifiers. |
| **Leaves** | Pill/Capsule | `Actions` and `Conditions` (The execution layer). |

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
   git clone https://github.com/ardabo1/behavior-tree-designer.git
```

2. Install dependencies:
```bash
   npm install
```

3. Run the development server:
```bash
   npm run dev
```
---

## ⌨️ Controls & Shortcuts

| Action | Control |
| :--- | :--- |
| Select a node / Pan canvas | Left Click |
| Lasso (Multi-select) nodes | `Shift` + Left Click & Drag |
| Remove selected nodes | `Delete` / `Backspace` |
| Zoom In/Out | Scroll |

---

## 📄 License

This project is licensed under the **MIT License** — feel free to use it in your own projects!
