# Changelog

## [v4.0.2] - 2026-03-21
### Fixed
- 修正 index.html 中的 JavaScript 語法錯誤 (移除重複的括號與分號)。
- 解決 sed 指令造成的引號衝突，改用原子化 cat 拼接。
### Added
- 實作公設費 (publicFee) 累加邏輯。
- 加入 2026 累進費率警示視覺效果 (總額 > 5000 觸發)。
- 支援 GAS 同步狀態雙向反饋。
