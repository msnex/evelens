import type { ThemeConfig } from 'antd'

export const appTheme: ThemeConfig = {
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 6,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  components: {
    Layout: {
      bodyBg: '#ffffff',
      headerBg: '#001529',
      headerColor: '#ffffff',
      headerHeight: 56,
      headerPadding: '0 20px',
    },
    Menu: {
      darkItemBg: '#001529',
      darkItemColor: 'rgba(255, 255, 255, 0.75)',
      darkItemHoverBg: 'rgba(255, 255, 255, 0.06)',
      darkItemHoverColor: '#ffffff',
      darkItemSelectedBg: '#1a2c3e',
      darkItemSelectedColor: '#ffffff',
      horizontalItemBorderRadius: 6,
      horizontalItemHoverBg: 'rgba(255, 255, 255, 0.06)',
      horizontalLineHeight: 48,
    },
    Table: {
      borderColor: '#f0f0f0',
      headerBg: '#fafafa',
      headerColor: '#1f2937',
      headerSplitColor: 'transparent',
      rowHoverBg: '#f5f8ff',
    },
  },
}
