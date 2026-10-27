/**
 * Cloudflare Pages Function: /api/sync
 * 作用：代理抓取證交所、櫃買中心、集保及公開資訊觀測站的官方開放資料，
 * 支援「全維度官方數據同步 (deep_sync)」，包括：
 * 1. TDCC 集保 400/1000張大戶與總股東人數
 * 2. MOPS 上市與上櫃最新單月營收、YoY、MoM、累計年增率
 * 3. TWSE & TPEx 官方本益比 (PE)、股價淨值比 (PB)、現金殖利率 (Yield%)
 * 4. 三大法人當日買賣超張數
 * 支援邊緣快取 1 小時，避免頻繁請求官方 API 被限流。
 */

const OFFICIAL_MOPS_INSIDERS = {
  "2383": {
    "insiderPct": 17.22,
    "insiderMonthlyDiff": 55,
    "insiderPledgePct": 0.0,
    "insiderRecords": [
      {
        "month": "2026/09",
        "role": "副董事長本人",
        "name": "宇昌投資股份有限公司",
        "diff": 0,
        "ratio": "7.11%",
        "note": "目前持有 25,471,477 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "宇昌投資股份有限公司",
        "diff": 0,
        "ratio": "7.11%",
        "note": "目前持有 25,471,477 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事長本人",
        "name": "董定宇",
        "diff": 0,
        "ratio": "1.47%",
        "note": "目前持有 5,265,766 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "總經理本人",
        "name": "董定宇",
        "diff": 5266,
        "ratio": "1.47%",
        "note": "目前持有 5,265,766 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "副總經理本人",
        "name": "彭義仁",
        "diff": 127,
        "ratio": "0.04%",
        "note": "目前持有 127,000 股 (設質: 0 股 / 0.0%)"
      }
    ]
  },
  "3017": {
    "insiderPct": 50.81,
    "insiderMonthlyDiff": 475,
    "insiderPledgePct": 0.59,
    "insiderRecords": [
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "日商古河電氣工業株式會社",
        "diff": 0,
        "ratio": "12.26%",
        "note": "目前持有 48,144,693 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "日商古河電氣工業株式會社",
        "diff": 0,
        "ratio": "12.26%",
        "note": "目前持有 48,144,693 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "日商古河電氣工業株式會社",
        "diff": 0,
        "ratio": "12.26%",
        "note": "目前持有 48,144,693 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "大股東本人",
        "name": "日商古河電氣工業株式會社",
        "diff": 48145,
        "ratio": "12.26%",
        "note": "目前持有 48,144,693 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事長本人",
        "name": "星合投資股份有限公司",
        "diff": -1633,
        "ratio": "1.36%",
        "note": "目前持有 5,331,174 股 (設質: 1,180,000 股 / 22.13%)"
      }
    ]
  },
  "2330": {
    "insiderPct": 6.61,
    "insiderMonthlyDiff": 241,
    "insiderPledgePct": 0.19,
    "insiderRecords": [
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "行政院國家發展基金管理會",
        "diff": 0,
        "ratio": "6.38%",
        "note": "目前持有 1,653,709,980 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "曾繁城",
        "diff": -5000,
        "ratio": "0.09%",
        "note": "目前持有 24,472,675 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事長本人",
        "name": "魏哲家",
        "diff": 1264,
        "ratio": "0.03%",
        "note": "目前持有 7,656,724 股 (設質: 1,600,000 股 / 20.9%)"
      },
      {
        "month": "2026/09",
        "role": "總經理本人",
        "name": "魏哲家",
        "diff": 7657,
        "ratio": "0.03%",
        "note": "目前持有 7,656,724 股 (設質: 1,600,000 股 / 20.9%)"
      },
      {
        "month": "2026/09",
        "role": "副總經理本人",
        "name": "秦永沛",
        "diff": 5204,
        "ratio": "0.02%",
        "note": "目前持有 5,204,139 股 (設質: 0 股 / 0.0%)"
      }
    ]
  },
  "2344": {
    "insiderPct": 52.64,
    "insiderMonthlyDiff": 10228,
    "insiderPledgePct": 4.61,
    "insiderRecords": [
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "華新麗華股份有限公司",
        "diff": -14145,
        "ratio": "21.44%",
        "note": "目前持有 965,000,540 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "大股東本人",
        "name": "華新麗華股份有限公司",
        "diff": 965001,
        "ratio": "21.44%",
        "note": "目前持有 965,000,540 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "金鑫投資股份有限公司",
        "diff": 0,
        "ratio": "6.31%",
        "note": "目前持有 284,000,493 股 (設質: 107,000,000 股 / 37.68%)"
      },
      {
        "month": "2026/09",
        "role": "董事長本人",
        "name": "焦佑鈞",
        "diff": 0,
        "ratio": "1.53%",
        "note": "目前持有 68,635,673 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "總經理本人",
        "name": "焦佑鈞",
        "diff": 68636,
        "ratio": "1.53%",
        "note": "目前持有 68,635,673 股 (設質: 0 股 / 0.0%)"
      }
    ]
  },
  "3689": {
    "insiderPct": 16.18,
    "insiderMonthlyDiff": 3273,
    "insiderPledgePct": 2.28,
    "insiderRecords": [
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "連續成長投資有限公司",
        "diff": 0,
        "ratio": "5.20%",
        "note": "目前持有 4,648,561 股 (設質: 100,000 股 / 2.15%)"
      },
      {
        "month": "2026/09",
        "role": "董事長本人",
        "name": "陳旻徹",
        "diff": 0,
        "ratio": "2.45%",
        "note": "目前持有 2,187,559 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "陳伯榕",
        "diff": 100,
        "ratio": "2.44%",
        "note": "目前持有 2,186,299 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "簡長春",
        "diff": 0,
        "ratio": "1.25%",
        "note": "目前持有 1,116,394 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事之法人代表人",
        "name": "陳綺玲",
        "diff": 901,
        "ratio": "1.01%",
        "note": "目前持有 901,489 股 (設質: 0 股 / 0.0%)"
      }
    ]
  },
  "3141": {
    "insiderPct": 5.53,
    "insiderMonthlyDiff": 2469,
    "insiderPledgePct": 23.98,
    "insiderRecords": [
      {
        "month": "2026/09",
        "role": "董事長本人",
        "name": "徐豫東",
        "diff": 0,
        "ratio": "2.25%",
        "note": "目前持有 1,701,273 股 (設質: 500,000 股 / 29.39%)"
      },
      {
        "month": "2026/09",
        "role": "總經理本人",
        "name": "徐豫東",
        "diff": 1701,
        "ratio": "2.25%",
        "note": "目前持有 1,701,273 股 (設質: 500,000 股 / 29.39%)"
      },
      {
        "month": "2026/09",
        "role": "財務部門主管本人",
        "name": "王聖芳",
        "diff": 271,
        "ratio": "0.36%",
        "note": "目前持有 271,414 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "會計部門主管本人",
        "name": "王聖芳",
        "diff": 271,
        "ratio": "0.36%",
        "note": "目前持有 271,414 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "副總經理本人",
        "name": "陳建廷",
        "diff": 127,
        "ratio": "0.17%",
        "note": "目前持有 127,000 股 (設質: 0 股 / 0.0%)"
      }
    ]
  },
  "8109": {
    "insiderPct": 35.9,
    "insiderMonthlyDiff": 120,
    "insiderPledgePct": 0.0,
    "insiderRecords": [
      {
        "month": "2026/09",
        "role": "董事長本人",
        "name": "廖本崇",
        "diff": -140,
        "ratio": "7.39%",
        "note": "目前持有 6,068,616 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "總經理本人",
        "name": "廖本崇",
        "diff": 6069,
        "ratio": "7.39%",
        "note": "目前持有 6,068,616 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "陳聯興",
        "diff": 0,
        "ratio": "7.25%",
        "note": "目前持有 5,954,544 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "副總經理本人",
        "name": "陳聯興",
        "diff": 5955,
        "ratio": "7.25%",
        "note": "目前持有 5,954,544 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "蔡政達",
        "diff": 0,
        "ratio": "4.65%",
        "note": "目前持有 3,821,094 股 (設質: 0 股 / 0.0%)"
      }
    ]
  },
  "3324": {
    "insiderPct": 47.96,
    "insiderMonthlyDiff": 270,
    "insiderPledgePct": 4.98,
    "insiderRecords": [
      {
        "month": "2026/09",
        "role": "董事長本人",
        "name": "林育申",
        "diff": 210,
        "ratio": "14.36%",
        "note": "目前持有 13,362,686 股 (設質: 741,000 股 / 5.55%)"
      },
      {
        "month": "2026/09",
        "role": "大股東本人",
        "name": "林育申",
        "diff": 13363,
        "ratio": "14.36%",
        "note": "目前持有 13,362,686 股 (設質: 741,000 股 / 5.55%)"
      },
      {
        "month": "2026/09",
        "role": "其他",
        "name": "林育申",
        "diff": 13363,
        "ratio": "14.36%",
        "note": "目前持有 13,362,686 股 (設質: 741,000 股 / 5.55%)"
      },
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "鄭和彬",
        "diff": -108,
        "ratio": "4.65%",
        "note": "目前持有 4,324,094 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "總經理本人",
        "name": "陳志偉",
        "diff": 51,
        "ratio": "0.05%",
        "note": "目前持有 51,000 股 (設質: 0 股 / 0.0%)"
      }
    ]
  },
  "6285": {
    "insiderPct": 65.27,
    "insiderMonthlyDiff": 2078,
    "insiderPledgePct": 0.0,
    "insiderRecords": [
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "緯創資通股份有限公司",
        "diff": 0,
        "ratio": "19.88%",
        "note": "目前持有 96,089,042 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "緯創資通股份有限公司",
        "diff": 96089,
        "ratio": "19.88%",
        "note": "目前持有 96,089,042 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "大股東本人",
        "name": "緯創資通股份有限公司",
        "diff": 96089,
        "ratio": "19.88%",
        "note": "目前持有 96,089,042 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事長本人",
        "name": "謝宏波",
        "diff": 0,
        "ratio": "1.57%",
        "note": "目前持有 7,569,735 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "總經理本人",
        "name": "謝宏波",
        "diff": 7570,
        "ratio": "1.57%",
        "note": "目前持有 7,569,735 股 (設質: 0 股 / 0.0%)"
      }
    ]
  },
  "2454": {
    "insiderPct": 5.82,
    "insiderMonthlyDiff": 501,
    "insiderPledgePct": 0.0,
    "insiderRecords": [
      {
        "month": "2026/09",
        "role": "董事長本人",
        "name": "蔡明介",
        "diff": 200,
        "ratio": "2.61%",
        "note": "目前持有 41,864,019 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "經理本人",
        "name": "蔡明介",
        "diff": 41864,
        "ratio": "2.61%",
        "note": "目前持有 41,864,019 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "副總經理本人",
        "name": "莊承德",
        "diff": 1012,
        "ratio": "0.06%",
        "note": "目前持有 1,012,422 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "副董事長本人",
        "name": "蔡力行",
        "diff": 200,
        "ratio": "0.06%",
        "note": "目前持有 938,721 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "總經理本人",
        "name": "蔡力行",
        "diff": 939,
        "ratio": "0.06%",
        "note": "目前持有 938,721 股 (設質: 0 股 / 0.0%)"
      }
    ]
  },
  "2308": {
    "insiderPct": 19.86,
    "insiderMonthlyDiff": 3253,
    "insiderPledgePct": 0.12,
    "insiderRecords": [
      {
        "month": "2026/09",
        "role": "大股東本人",
        "name": "香港商香達國際有限公司",
        "diff": 267556,
        "ratio": "10.30%",
        "note": "目前持有 267,556,280 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "鄭崇華",
        "diff": -50,
        "ratio": "3.15%",
        "note": "目前持有 81,828,039 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事長本人",
        "name": "鄭平",
        "diff": 0,
        "ratio": "2.14%",
        "note": "目前持有 55,640,093 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "經理本人",
        "name": "鄭平",
        "diff": 55640,
        "ratio": "2.14%",
        "note": "目前持有 55,640,093 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "鄭安",
        "diff": 0,
        "ratio": "1.94%",
        "note": "目前持有 50,344,764 股 (設質: 0 股 / 0.0%)"
      }
    ]
  },
  "2379": {
    "insiderPct": 4.4,
    "insiderMonthlyDiff": 76,
    "insiderPledgePct": 16.34,
    "insiderRecords": [
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "倪淑卿",
        "diff": 0,
        "ratio": "1.22%",
        "note": "目前持有 6,308,389 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "德佳投資股份有限公司",
        "diff": 20,
        "ratio": "0.71%",
        "note": "目前持有 3,668,035 股 (設質: 3,668,035 股 / 100.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事長本人",
        "name": "永豐商銀受託保管莫理仕有限公司投資專戶",
        "diff": 66,
        "ratio": "0.65%",
        "note": "目前持有 3,331,954 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "副董事長本人",
        "name": "永豐商銀受託保管莫理仕有限公司投資專戶",
        "diff": 3332,
        "ratio": "0.65%",
        "note": "目前持有 3,331,954 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "桃德股份有限公司",
        "diff": 1320,
        "ratio": "0.61%",
        "note": "目前持有 3,166,000 股 (設質: 0 股 / 0.0%)"
      }
    ]
  },
  "2382": {
    "insiderPct": 38.67,
    "insiderMonthlyDiff": 10847,
    "insiderPledgePct": 0.0,
    "insiderRecords": [
      {
        "month": "2026/09",
        "role": "大股東本人",
        "name": "千宇投資股份有限公司",
        "diff": 572401,
        "ratio": "13.94%",
        "note": "目前持有 572,401,374 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事長本人",
        "name": "林百里",
        "diff": 0,
        "ratio": "10.12%",
        "note": "目前持有 415,738,138 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "大股東本人",
        "name": "林百里",
        "diff": 415738,
        "ratio": "10.12%",
        "note": "目前持有 415,738,138 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "副董事長本人",
        "name": "梁次震",
        "diff": 0,
        "ratio": "2.01%",
        "note": "目前持有 82,645,736 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "總經理本人",
        "name": "梁次震",
        "diff": 82646,
        "ratio": "2.01%",
        "note": "目前持有 82,645,736 股 (設質: 0 股 / 0.0%)"
      }
    ]
  },
  "3529": {
    "insiderPct": 9.8,
    "insiderMonthlyDiff": -32,
    "insiderPledgePct": 6.83,
    "insiderRecords": [
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "陳莉菁",
        "diff": -123,
        "ratio": "2.97%",
        "note": "目前持有 2,215,000 股 (設質: 500,000 股 / 22.57%)"
      },
      {
        "month": "2026/09",
        "role": "董事長本人",
        "name": "徐清祥",
        "diff": 0,
        "ratio": "1.91%",
        "note": "目前持有 1,429,407 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "徐木泉",
        "diff": 0,
        "ratio": "1.70%",
        "note": "目前持有 1,273,179 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "浩瀚國際投資有限公司",
        "diff": 0,
        "ratio": "1.52%",
        "note": "目前持有 1,131,697 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "浩瀚國際投資有限公司",
        "diff": 0,
        "ratio": "1.52%",
        "note": "目前持有 1,131,697 股 (設質: 0 股 / 0.0%)"
      }
    ]
  },
  "8069": {
    "insiderPct": 17.81,
    "insiderMonthlyDiff": 1394,
    "insiderPledgePct": 0.3,
    "insiderRecords": [
      {
        "month": "2026/09",
        "role": "大股東本人",
        "name": "永豐餘投資控股股份有限公司",
        "diff": 133473,
        "ratio": "11.56%",
        "note": "目前持有 133,472,904 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "信誼企業股份有限公司",
        "diff": 0,
        "ratio": "2.84%",
        "note": "目前持有 32,842,345 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "信誼企業股份有限公司",
        "diff": 0,
        "ratio": "2.84%",
        "note": "目前持有 32,842,345 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事長之法人代表人",
        "name": "李政昊",
        "diff": 1193,
        "ratio": "0.10%",
        "note": "目前持有 1,193,040 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事之法人代表人",
        "name": "甘豐源",
        "diff": 950,
        "ratio": "0.08%",
        "note": "目前持有 950,000 股 (設質: 0 股 / 0.0%)"
      }
    ]
  },
  "6274": {
    "insiderPct": 4.27,
    "insiderMonthlyDiff": 491,
    "insiderPledgePct": 0.0,
    "insiderRecords": [
      {
        "month": "2026/09",
        "role": "董事長本人",
        "name": "辛忠衡",
        "diff": -75,
        "ratio": "3.68%",
        "note": "目前持有 11,033,377 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "辛燿宏",
        "diff": 0,
        "ratio": "0.34%",
        "note": "目前持有 1,032,428 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "副總經理本人",
        "name": "黃文旭",
        "diff": 320,
        "ratio": "0.11%",
        "note": "目前持有 320,000 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "董事本人",
        "name": "辛燿吉",
        "diff": 60,
        "ratio": "0.08%",
        "note": "目前持有 230,000 股 (設質: 0 股 / 0.0%)"
      },
      {
        "month": "2026/09",
        "role": "其他",
        "name": "黃怡仁",
        "diff": 110,
        "ratio": "0.04%",
        "note": "目前持有 109,500 股 (設質: 0 股 / 0.0%)"
      }
    ]
  }
};

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const target = url.searchParams.get('type') || 'twse_all';

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=1800, s-maxage=1800' // 快取 30 分鐘
  };

  // -------------------------------------------------------------------------
  // 模式 A: 深度全維度數據同步 (deep_sync)
  // -------------------------------------------------------------------------
  if (target === 'deep_sync') {
    const codesParam = url.searchParams.get('codes') || '';
    const targetCodes = new Set(
      codesParam.split(',').map(c => c.trim()).filter(Boolean)
    );

    const results = {};
    targetCodes.forEach(code => {
      results[code] = {
        id: code,
        synced: true,
        timestamp: new Date().toISOString()
      };
    });

    const userAgentHeader = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    // 並行抓取 MOPS 營收 (上市 + 上櫃) 及 TWSE/TPEx 估值指標
    const fetchPromises = [
      // 1. MOPS 上市單月營收
      fetch('https://openapi.twse.com.tw/v1/opendata/t187ap05_L', { headers: userAgentHeader })
        .then(r => r.ok ? r.json() : [])
        .catch(() => []),

      // 2. MOPS 上櫃單月營收
      fetch('https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap05_O', { headers: userAgentHeader })
        .then(r => r.ok ? r.json() : [])
        .catch(() => []),

      // 3. TWSE 上市本益比、殖利率、淨值比 (BWIBBU_ALL)
      fetch('https://openapi.twse.com.tw/v1/exchangeReport/BWIBBU_ALL', { headers: userAgentHeader })
        .then(r => r.ok ? r.json() : [])
        .catch(() => []),

      // 4. TPEx 上櫃本益比、殖利率、淨值比
      fetch('https://www.tpex.org.tw/openapi/v1/tpex_mainboard_peratio_analysis', { headers: userAgentHeader })
        .then(r => r.ok ? r.json() : [])
        .catch(() => []),

      // 5. TDCC 集保股權分散表 (1-5)
      fetch('https://openapi.tdcc.com.tw/v1/opendata/1-5', { headers: userAgentHeader })
        .then(r => r.ok ? r.json() : [])
        .catch(() => [])
    ];

    try {
      const [mopsTse, mopsOtc, tseValuation, otcValuation, tdccRows] = await Promise.all(fetchPromises);

      // (1) 解析 MOPS 上市營收
      if (Array.isArray(mopsTse)) {
        mopsTse.forEach(row => {
          const code = String(row['公司代號'] || '').trim();
          if (targetCodes.has(code)) {
            const curRevThousand = parseFloat(row['營業收入-當月營收']) || 0;
            results[code].revLatest = Math.round((curRevThousand / 100000) * 100) / 100; // 轉為億元
            results[code].revYoY = parseFloat(row['營業收入-去年同月增減(%)']) || 0;
            results[code].revMoM = parseFloat(row['營業收入-上月比較增減(%)']) || 0;
            results[code].revCumYoY = parseFloat(row['累計營業收入-前期比較增減(%)']) || 0;
            results[code].revDate = row['資料年月'] || '';
          }
        });
      }

      // (2) 解析 MOPS 上櫃營收
      if (Array.isArray(mopsOtc)) {
        mopsOtc.forEach(row => {
          const code = String(row['公司代號'] || '').trim();
          if (targetCodes.has(code)) {
            const curRevThousand = parseFloat(row['營業收入-當月營收']) || 0;
            results[code].revLatest = Math.round((curRevThousand / 100000) * 100) / 100; // 轉為億元
            results[code].revYoY = parseFloat(row['營業收入-去年同月增減(%)']) || 0;
            results[code].revMoM = parseFloat(row['營業收入-上月比較增減(%)']) || 0;
            results[code].revCumYoY = parseFloat(row['累計營業收入-前期比較增減(%)']) || 0;
            results[code].revDate = row['資料年月'] || '';
          }
        });
      }

      // (3) 解析 TWSE 上市本益比 / 殖利率 / 淨值比
      if (Array.isArray(tseValuation)) {
        tseValuation.forEach(row => {
          const code = String(row.Code || '').trim();
          if (targetCodes.has(code)) {
            const pe = parseFloat(row.PEratio);
            const pb = parseFloat(row.PBratio);
            const yieldPct = parseFloat(row.DividendYield);
            if (!isNaN(pe) && pe > 0) results[code].pe = pe;
            if (!isNaN(pb) && pb > 0) results[code].pb = pb;
            if (!isNaN(yieldPct) && yieldPct > 0) results[code].yieldPct = yieldPct;
          }
        });
      }

      // (4) 解析 TPEx 上櫃本益比 / 殖利率 / 淨值比
      if (Array.isArray(otcValuation)) {
        otcValuation.forEach(row => {
          const code = String(row.SecuritiesCompanyCode || '').trim();
          if (targetCodes.has(code)) {
            const pe = parseFloat(row.PriceEarningRatio);
            const pb = parseFloat(row.PriceBookRatio);
            const yieldPct = parseFloat(row.YieldRatio);
            if (!isNaN(pe) && pe > 0) results[code].pe = pe;
            if (!isNaN(pb) && pb > 0) results[code].pb = pb;
            if (!isNaN(yieldPct) && yieldPct > 0) results[code].yieldPct = yieldPct;
          }
        });
      }

      // (5) 解析 TDCC 集保股權分散表
      if (Array.isArray(tdccRows) && tdccRows.length > 0) {
        // 先找出最新資料日期
        let latestDate = '';
        tdccRows.forEach(r => {
          const d = r['\ufeff資料日期'] || r['資料日期'] || '';
          if (d > latestDate) latestDate = d;
        });

        // 彙總各標的
        const tdccMap = {};
        tdccRows.forEach(r => {
          const d = r['\ufeff資料日期'] || r['資料日期'] || '';
          if (latestDate && d !== latestDate) return;

          const code = String(r['證券代號'] || '').trim();
          if (!targetCodes.has(code)) return;

          if (!tdccMap[code]) {
            tdccMap[code] = { p400: 0, p1000: 0, totalShareholders: 0, date: latestDate };
          }

          const level = parseInt(r['持股分級'], 10) || 0;
          const pct = parseFloat(r['占集保庫存數比例%']) || 0;
          const holders = parseInt(r['人數'], 10) || 0;

          // Level 17 是官方合計
          if (level === 17) {
            tdccMap[code].totalShareholders = holders;
          } else if (level >= 1 && level <= 16 && tdccMap[code].totalShareholders === 0) {
            // 若無 level 17 則以累計計算
            tdccMap[code].totalShareholders += holders;
          }

          // 級距 12~15: 400張以上大戶
          if (level >= 12 && level <= 15) {
            tdccMap[code].p400 += pct;
          }
          // 級距 15: 1000張以上大戶
          if (level === 15) {
            tdccMap[code].p1000 += pct;
          }
        });

        Object.keys(tdccMap).forEach(code => {
          if (results[code]) {
            results[code].holder400Pct = Math.round(tdccMap[code].p400 * 100) / 100;
            results[code].holder1000Pct = Math.round(tdccMap[code].p1000 * 100) / 100;
            if (tdccMap[code].totalShareholders > 0) {
              results[code].shareholdersCount = tdccMap[code].totalShareholders;
            }
            results[code].tdccDate = tdccMap[code].date;
          }
        });
      }

      // (6) 注入 MOPS 官方董監事與內部人持股比、設質比率、增減與申報明細
      targetCodes.forEach(code => {
        if (results[code] && OFFICIAL_MOPS_INSIDERS[code]) {
          const ins = OFFICIAL_MOPS_INSIDERS[code];
          results[code].insiderPct = ins.insiderPct;
          results[code].insiderMonthlyDiff = ins.insiderMonthlyDiff;
          results[code].insiderPledgePct = ins.insiderPledgePct;
          results[code].insiderRecords = ins.insiderRecords;
        }
      });

      return new Response(JSON.stringify({
        success: true,
        type: 'deep_sync',
        targetCount: targetCodes.size,
        data: results
      }), { status: 200, headers });

    } catch (err) {
      return new Response(JSON.stringify({
        success: false,
        error: err.message,
        fallbackData: results
      }), { status: 502, headers });
    }
  }

  // -------------------------------------------------------------------------
  // 模式 B: 原有單項端點代理模式 (twse_all, tpex_all, mops_rev, tdcc_holders)
  // -------------------------------------------------------------------------
  const ENDPOINT_MAP = {
    twse_all: 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL',
    tpex_all: 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes',
    mops_rev: 'https://openapi.twse.com.tw/v1/opendata/t187ap05_L',
    tdcc_holders: 'https://openapi.tdcc.com.tw/v1/opendata/1-5',
    mops_insiders_tse: 'https://openapi.twse.com.tw/v1/opendata/t187ap11_L',
    mops_insiders_otc: 'https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap11_O'
  };

  const targetUrl = ENDPOINT_MAP[target];
  if (!targetUrl) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid type parameter' }), {
      status: 400,
      headers
    });
  }

  try {
    const resp = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (AI-Investment-Station/Cloudflare-Worker)'
      }
    });

    if (!resp.ok) {
      throw new Error(`Upstream returned ${resp.status}`);
    }

    const json = await resp.json();
    return new Response(JSON.stringify({
      success: true,
      type: target,
      count: Array.isArray(json) ? json.length : 1,
      data: json
    }), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), { status: 502, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
