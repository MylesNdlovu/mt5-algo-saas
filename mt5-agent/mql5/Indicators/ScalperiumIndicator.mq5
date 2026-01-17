//+------------------------------------------------------------------+
//|                                          ScalperiumIndicator.mq5  |
//|                                    Copyright 2026, Scalperium.    |
//|                                       https://scalperium.com      |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, Scalperium"
#property link      "https://scalperium.com"
#property version   "1.00"
#property description "Traffic Light Indicator for Scalping Conditions"
#property description "RED = No Trading, ORANGE = OK, GREEN = Great"
#property indicator_chart_window
#property indicator_buffers 0
#property indicator_plots   0

#include <BridgeServer.mqh>

//--- Input parameters
input group "=== Bridge Settings ==="
input int      BridgeId = 0;              // Bridge ID (0 = use account number)

input group "=== ATR Settings (AI-Upgradeable) ==="
input int      ATR_Period = 14;           // ATR Period for volatility
input double   ATR_HighThreshold = 50;    // ATR High (points) - RED if above
input double   ATR_LowThreshold = 10;     // ATR Low (points) - GREEN if below

input group "=== RSI Settings (AI-Upgradeable) ==="
input int      RSI_Period = 14;           // RSI Period
input double   RSI_Overbought = 70;       // RSI Overbought level
input double   RSI_Oversold = 30;         // RSI Oversold level

input group "=== Market Conditions ==="
input int      SpreadMaxPips = 3;         // Max spread (pips) for GREEN
input bool     CheckNewsTime = true;      // Check news/session times
input int      SessionStartHour = 8;      // Trading session start (GMT)
input int      SessionEndHour = 20;       // Trading session end (GMT)

input group "=== Tick Activity (AI-Upgradeable) ==="
input int      TicksPerMinuteHigh = 100;  // Ticks/min for GREEN
input int      TicksPerMinuteLow = 30;    // Ticks/min for ORANGE

//--- Indicator handles
int atrHandle;
int rsiHandle;

//--- Global state
string currentSignal = "RED";
double currentScore = 0.0;

//+------------------------------------------------------------------+
//| Custom indicator initialization function                          |
//+------------------------------------------------------------------+
int OnInit()
{
    // Use account number as bridge ID if not specified
    int bridgeId = BridgeId;
    if(bridgeId == 0)
    {
        bridgeId = (int)AccountInfoInteger(ACCOUNT_LOGIN);
    }

    // Initialize bridge for C# agent communication
    BridgeInit(bridgeId);

    // Create ATR indicator on M1 timeframe
    atrHandle = iATR(_Symbol, PERIOD_M1, ATR_Period);
    if(atrHandle == INVALID_HANDLE)
    {
        Print("Failed to create ATR indicator");
        return INIT_FAILED;
    }

    // Create RSI indicator on M1 timeframe
    rsiHandle = iRSI(_Symbol, PERIOD_M1, RSI_Period, PRICE_CLOSE);
    if(rsiHandle == INVALID_HANDLE)
    {
        Print("Failed to create RSI indicator");
        return INIT_FAILED;
    }

    // Set timer for signal updates (500ms)
    EventSetMillisecondTimer(500);

    Print("ScalperiumIndicator initialized - BridgeId: ", bridgeId, " Account: ", AccountInfoInteger(ACCOUNT_LOGIN));
    return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Custom indicator deinitialization function                        |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    EventKillTimer();
    BridgeDeinit();

    if(atrHandle != INVALID_HANDLE)
        IndicatorRelease(atrHandle);
    if(rsiHandle != INVALID_HANDLE)
        IndicatorRelease(rsiHandle);
}

//+------------------------------------------------------------------+
//| Timer function                                                    |
//+------------------------------------------------------------------+
void OnTimer()
{
    CalculateSignal();
    UpdateDisplay();

    // Update bridge with current signal
    BridgeSetSignal(currentSignal, currentScore);
}

//+------------------------------------------------------------------+
//| Custom indicator iteration function                               |
//+------------------------------------------------------------------+
int OnCalculate(const int rates_total,
                const int prev_calculated,
                const datetime &time[],
                const double &open[],
                const double &high[],
                const double &low[],
                const double &close[],
                const long &tick_volume[],
                const long &volume[],
                const int &spread[])
{
    CalculateSignal();
    return rates_total;
}

//+------------------------------------------------------------------+
//| Calculate the trading signal                                      |
//+------------------------------------------------------------------+
void CalculateSignal()
{
    double score = 0.0;
    int factors = 0;

    //--- Get current values
    double atrValue[];
    double rsiValue[];

    ArraySetAsSeries(atrValue, true);
    ArraySetAsSeries(rsiValue, true);

    if(CopyBuffer(atrHandle, 0, 0, 1, atrValue) <= 0) return;
    if(CopyBuffer(rsiHandle, 0, 0, 1, rsiValue) <= 0) return;

    double atr = atrValue[0] / _Point;  // Convert to points
    double rsi = rsiValue[0];

    //--- 1. Volatility Check (ATR)
    factors++;
    if(atr < ATR_LowThreshold)
    {
        score += 1.0;  // Low volatility = good for scalping
    }
    else if(atr < ATR_HighThreshold)
    {
        score += 0.5;  // Medium volatility = OK
    }
    else
    {
        score += 0.0;  // High volatility = dangerous
    }

    //--- 2. RSI Check (not extreme)
    factors++;
    if(rsi > RSI_Oversold && rsi < RSI_Overbought)
    {
        score += 1.0;  // RSI in normal range = good
    }
    else if((rsi >= RSI_Overbought - 10 && rsi < RSI_Overbought) ||
            (rsi > RSI_Oversold && rsi <= RSI_Oversold + 10))
    {
        score += 0.5;  // Approaching extremes = caution
    }
    else
    {
        score += 0.0;  // Extreme RSI = avoid
    }

    //--- 3. Spread Check
    factors++;
    double spread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD) * _Point / _Point;
    double spreadPips = spread / 10.0;  // Convert to pips

    if(spreadPips <= SpreadMaxPips)
    {
        score += 1.0;  // Low spread = good
    }
    else if(spreadPips <= SpreadMaxPips * 2)
    {
        score += 0.5;  // Medium spread = OK
    }
    else
    {
        score += 0.0;  // High spread = bad
    }

    //--- 4. Session Time Check
    if(CheckNewsTime)
    {
        factors++;
        MqlDateTime dt;
        TimeGMT(dt);

        if(dt.hour >= SessionStartHour && dt.hour < SessionEndHour)
        {
            // During trading session
            if(dt.day_of_week >= 1 && dt.day_of_week <= 5)  // Weekdays
            {
                score += 1.0;
            }
            else
            {
                score += 0.0;  // Weekend
            }
        }
        else
        {
            score += 0.5;  // Outside main session
        }
    }

    //--- 5. Tick Activity (market activity)
    factors++;
    static datetime lastTickTime = 0;
    static int tickCount = 0;
    static datetime tickWindowStart = 0;

    datetime now = TimeCurrent();
    if(now - tickWindowStart > 60)
    {
        tickCount = 0;
        tickWindowStart = now;
    }
    tickCount++;

    if(tickCount > TicksPerMinuteHigh)  // High tick activity = optimal
    {
        score += 1.0;
    }
    else if(tickCount > TicksPerMinuteLow)  // Medium activity = acceptable
    {
        score += 0.5;
    }
    else
    {
        score += 0.0;  // Low activity = poor conditions
    }

    //--- Calculate final score (0-100)
    currentScore = (score / factors) * 100;

    //--- Determine signal
    if(currentScore >= 70)
    {
        currentSignal = "GREEN";
    }
    else if(currentScore >= 40)
    {
        currentSignal = "ORANGE";
    }
    else
    {
        currentSignal = "RED";
    }
}

//+------------------------------------------------------------------+
//| Update chart display                                              |
//+------------------------------------------------------------------+
void UpdateDisplay()
{
    string labelName = "ScalperiumSignal";
    color signalColor;

    if(currentSignal == "GREEN")
        signalColor = clrLime;
    else if(currentSignal == "ORANGE")
        signalColor = clrOrange;
    else
        signalColor = clrRed;

    // Delete existing label
    ObjectDelete(0, labelName);
    ObjectDelete(0, labelName + "_bg");

    // Create background
    ObjectCreate(0, labelName + "_bg", OBJ_RECTANGLE_LABEL, 0, 0, 0);
    ObjectSetInteger(0, labelName + "_bg", OBJPROP_CORNER, CORNER_RIGHT_UPPER);
    ObjectSetInteger(0, labelName + "_bg", OBJPROP_XDISTANCE, 150);
    ObjectSetInteger(0, labelName + "_bg", OBJPROP_YDISTANCE, 10);
    ObjectSetInteger(0, labelName + "_bg", OBJPROP_XSIZE, 140);
    ObjectSetInteger(0, labelName + "_bg", OBJPROP_YSIZE, 60);
    ObjectSetInteger(0, labelName + "_bg", OBJPROP_BGCOLOR, clrBlack);
    ObjectSetInteger(0, labelName + "_bg", OBJPROP_BORDER_COLOR, signalColor);
    ObjectSetInteger(0, labelName + "_bg", OBJPROP_BORDER_TYPE, BORDER_FLAT);
    ObjectSetInteger(0, labelName + "_bg", OBJPROP_WIDTH, 2);

    // Create signal label
    ObjectCreate(0, labelName, OBJ_LABEL, 0, 0, 0);
    ObjectSetInteger(0, labelName, OBJPROP_CORNER, CORNER_RIGHT_UPPER);
    ObjectSetInteger(0, labelName, OBJPROP_XDISTANCE, 145);
    ObjectSetInteger(0, labelName, OBJPROP_YDISTANCE, 20);
    ObjectSetString(0, labelName, OBJPROP_TEXT, StringFormat("%s (%.0f%%)", currentSignal, currentScore));
    ObjectSetInteger(0, labelName, OBJPROP_COLOR, signalColor);
    ObjectSetInteger(0, labelName, OBJPROP_FONTSIZE, 14);
    ObjectSetString(0, labelName, OBJPROP_FONT, "Arial Bold");
    ObjectSetInteger(0, labelName, OBJPROP_ANCHOR, ANCHOR_RIGHT_UPPER);

    // Create description label
    string description = GetSignalDescription();
    ObjectDelete(0, labelName + "_desc");
    ObjectCreate(0, labelName + "_desc", OBJ_LABEL, 0, 0, 0);
    ObjectSetInteger(0, labelName + "_desc", OBJPROP_CORNER, CORNER_RIGHT_UPPER);
    ObjectSetInteger(0, labelName + "_desc", OBJPROP_XDISTANCE, 145);
    ObjectSetInteger(0, labelName + "_desc", OBJPROP_YDISTANCE, 45);
    ObjectSetString(0, labelName + "_desc", OBJPROP_TEXT, description);
    ObjectSetInteger(0, labelName + "_desc", OBJPROP_COLOR, clrGray);
    ObjectSetInteger(0, labelName + "_desc", OBJPROP_FONTSIZE, 8);
    ObjectSetString(0, labelName + "_desc", OBJPROP_FONT, "Arial");
    ObjectSetInteger(0, labelName + "_desc", OBJPROP_ANCHOR, ANCHOR_RIGHT_UPPER);

    ChartRedraw();
}

//+------------------------------------------------------------------+
//| Get human-readable signal description                             |
//+------------------------------------------------------------------+
string GetSignalDescription()
{
    if(currentSignal == "GREEN")
        return "Optimal scalping conditions";
    else if(currentSignal == "ORANGE")
        return "Proceed with caution";
    else
        return "Trading not recommended";
}

//+------------------------------------------------------------------+
//| Get current signal for EA                                         |
//+------------------------------------------------------------------+
string GetCurrentSignal()
{
    return currentSignal;
}

//+------------------------------------------------------------------+
//| Get current score for EA                                          |
//+------------------------------------------------------------------+
double GetCurrentScore()
{
    return currentScore;
}
//+------------------------------------------------------------------+
