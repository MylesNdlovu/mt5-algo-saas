//+------------------------------------------------------------------+
//|                                        ScalperiumCopyMaster.mq5  |
//|                                    Copyright 2026, Scalperium.    |
//|                                       https://scalperium.com      |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, Scalperium"
#property link      "https://scalperium.com"
#property version   "1.00"
#property description "Tick Scalping Copy Master EA"
#property description "Reads indicator signal: RED=Stop, ORANGE=Cautious, GREEN=Normal"

#include <BridgeServer.mqh>
#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>
#include <Trade\OrderInfo.mqh>

//--- Input parameters
input group "=== Trading Settings ==="
input double   BaseLotSize = 0.01;          // Base lot size
input double   MaxLotSize = 1.0;            // Maximum lot size
input int      MaxOpenTrades = 5;           // Max concurrent trades
input double   RiskPercent = 1.0;           // Risk per trade (% of balance)

input group "=== Risk Management ==="
input int      DefaultSL_Points = 100;       // Default Stop Loss (points)
input int      DefaultTP_Points = 150;       // Default Take Profit (points)
input int      TrailingSL_Points = 50;       // Trailing Stop (0=disabled)
input int      BreakEven_Points = 30;        // Break Even activation (0=disabled)

input group "=== Indicator Signal Settings ==="
input bool     UseIndicatorSignal = true;    // Use traffic light indicator
input double   OrangeLotMultiplier = 0.5;    // Lot multiplier on ORANGE (50%)
input bool     AllowTradeOnRed = false;      // Allow trading on RED signal

input group "=== Master Settings ==="
input int      MagicNumber = 20260116;       // Magic number for trades
input string   MasterComment = "SCM";        // Trade comment prefix
input int      BridgePort = 8080;            // HTTP Bridge port

//--- Global objects
CTrade trade;
CPositionInfo positionInfo;
COrderInfo orderInfo;

//--- Global state
bool eaRunning = false;
bool eaPaused = false;
datetime lastTradeTime = 0;
string currentSignal = "RED";
double currentScore = 0.0;
int openPositionCount = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                     |
//+------------------------------------------------------------------+
int OnInit()
{
    // Initialize trade object
    trade.SetExpertMagicNumber(MagicNumber);
    trade.SetDeviationInPoints(10);
    trade.SetTypeFilling(ORDER_FILLING_IOC);
    trade.SetAsyncMode(false);

    // Initialize bridge
    BridgeInit(MagicNumber, BridgePort);

    // Set timer for bridge communication
    EventSetMillisecondTimer(250);

    // Start EA
    eaRunning = true;
    eaPaused = false;

    Print("ScalperiumCopyMaster initialized - MagicNumber: ", MagicNumber);
    return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                   |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    EventKillTimer();
    BridgeDeinit();
    Print("ScalperiumCopyMaster deinitialized - Reason: ", reason);
}

//+------------------------------------------------------------------+
//| Timer function - Bridge communication                             |
//+------------------------------------------------------------------+
void OnTimer()
{
    // Process bridge commands from C# agent
    ProcessBridgeCommands();

    // Update bridge with current state
    UpdateBridgeStatus();

    // Apply trailing stop if enabled
    if(TrailingSL_Points > 0)
        ApplyTrailingStop();

    // Apply break even if enabled
    if(BreakEven_Points > 0)
        ApplyBreakEven();
}

//+------------------------------------------------------------------+
//| Expert tick function                                               |
//+------------------------------------------------------------------+
void OnTick()
{
    // Skip if not running or paused
    if(!eaRunning || eaPaused)
        return;

    // Get indicator signal
    if(UseIndicatorSignal)
    {
        BridgeGetSignal(currentSignal, currentScore);
    }
    else
    {
        currentSignal = "GREEN";
        currentScore = 100.0;
    }

    // Check if trading is allowed
    if(!BridgeIsTradingEnabled())
        return;

    // Check signal conditions
    if(currentSignal == "RED" && !AllowTradeOnRed)
        return;

    // Count open positions
    openPositionCount = CountOpenPositions();

    // Check max trades limit
    if(openPositionCount >= MaxOpenTrades)
        return;

    // Your trading logic goes here
    // This is a placeholder - integrate your existing scalping logic

    // Example: Simple tick scalping entry logic (placeholder)
    // CheckEntrySignals();
}

//+------------------------------------------------------------------+
//| Process commands from C# agent                                    |
//+------------------------------------------------------------------+
void ProcessBridgeCommands()
{
    string command = "";
    string params = "";

    if(BridgeGetCommand(command, params))
    {
        Print("Processing bridge command: ", command, " params: ", params);

        if(command == "START")
        {
            eaRunning = true;
            eaPaused = false;
            Print("EA Started via bridge");
        }
        else if(command == "STOP")
        {
            eaRunning = false;
            eaPaused = false;
            Print("EA Stopped via bridge");
        }
        else if(command == "PAUSE")
        {
            eaPaused = true;
            Print("EA Paused via bridge");
        }
        else if(command == "RESUME")
        {
            eaPaused = false;
            Print("EA Resumed via bridge");
        }
        else if(command == "CLOSE_ALL")
        {
            CloseAllPositions();
            Print("Closed all positions via bridge");
        }
        else if(command == "UPDATE_SETTINGS")
        {
            // Parse and apply settings from params JSON
            ApplySettingsFromBridge(params);
        }

        // Acknowledge command
        BridgeAcknowledgeCommand(command);
    }
}

//+------------------------------------------------------------------+
//| Update bridge with current EA status                              |
//+------------------------------------------------------------------+
void UpdateBridgeStatus()
{
    EABridgeStatus status;
    status.loaded = true;
    status.running = eaRunning;
    status.paused = eaPaused;
    status.name = "ScalperiumCopyMaster";
    status.symbol = _Symbol;
    status.timeframe = EnumToString(_Period);
    status.magicNumber = MagicNumber;
    status.openPositions = openPositionCount;
    status.indicatorSignal = currentSignal;
    status.indicatorScore = currentScore;

    BridgeSetStatus(status);
}

//+------------------------------------------------------------------+
//| Calculate lot size based on signal and risk                       |
//+------------------------------------------------------------------+
double CalculateLotSize()
{
    double lot = BaseLotSize;

    // Apply risk-based lot sizing
    if(RiskPercent > 0)
    {
        double balance = AccountInfoDouble(ACCOUNT_BALANCE);
        double riskAmount = balance * (RiskPercent / 100.0);
        double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
        double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);

        if(tickValue > 0 && DefaultSL_Points > 0)
        {
            double pointValue = tickValue / tickSize * _Point;
            lot = riskAmount / (DefaultSL_Points * pointValue);
        }
    }

    // Apply signal-based multiplier
    if(currentSignal == "ORANGE")
    {
        lot *= OrangeLotMultiplier;
    }
    else if(currentSignal == "RED" && AllowTradeOnRed)
    {
        lot *= 0.25;  // Quarter size on RED
    }

    // Apply limits
    double minLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
    double maxLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
    double stepLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);

    lot = MathMax(minLot, MathMin(MaxLotSize, MathMin(maxLot, lot)));
    lot = MathFloor(lot / stepLot) * stepLot;

    return NormalizeDouble(lot, 2);
}

//+------------------------------------------------------------------+
//| Open BUY position                                                  |
//+------------------------------------------------------------------+
bool OpenBuy(string signal = "")
{
    if(!eaRunning || eaPaused) return false;
    if(openPositionCount >= MaxOpenTrades) return false;

    double lot = CalculateLotSize();
    double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
    double sl = DefaultSL_Points > 0 ? ask - DefaultSL_Points * _Point : 0;
    double tp = DefaultTP_Points > 0 ? ask + DefaultTP_Points * _Point : 0;

    string comment = MasterComment + "_" + signal;

    if(trade.Buy(lot, _Symbol, ask, sl, tp, comment))
    {
        Print("BUY opened: ", lot, " lots at ", ask, " SL: ", sl, " TP: ", tp);
        lastTradeTime = TimeCurrent();

        // Notify bridge of new trade
        BridgeNotifyTradeOpened(trade.ResultOrder(), "BUY", lot, ask, sl, tp);
        return true;
    }
    else
    {
        Print("BUY failed: ", trade.ResultRetcode(), " - ", trade.ResultRetcodeDescription());
        return false;
    }
}

//+------------------------------------------------------------------+
//| Open SELL position                                                 |
//+------------------------------------------------------------------+
bool OpenSell(string signal = "")
{
    if(!eaRunning || eaPaused) return false;
    if(openPositionCount >= MaxOpenTrades) return false;

    double lot = CalculateLotSize();
    double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
    double sl = DefaultSL_Points > 0 ? bid + DefaultSL_Points * _Point : 0;
    double tp = DefaultTP_Points > 0 ? bid - DefaultTP_Points * _Point : 0;

    string comment = MasterComment + "_" + signal;

    if(trade.Sell(lot, _Symbol, bid, sl, tp, comment))
    {
        Print("SELL opened: ", lot, " lots at ", bid, " SL: ", sl, " TP: ", tp);
        lastTradeTime = TimeCurrent();

        // Notify bridge of new trade
        BridgeNotifyTradeOpened(trade.ResultOrder(), "SELL", lot, bid, sl, tp);
        return true;
    }
    else
    {
        Print("SELL failed: ", trade.ResultRetcode(), " - ", trade.ResultRetcodeDescription());
        return false;
    }
}

//+------------------------------------------------------------------+
//| Count open positions with our magic number                        |
//+------------------------------------------------------------------+
int CountOpenPositions()
{
    int count = 0;
    for(int i = PositionsTotal() - 1; i >= 0; i--)
    {
        if(positionInfo.SelectByIndex(i))
        {
            if(positionInfo.Magic() == MagicNumber && positionInfo.Symbol() == _Symbol)
            {
                count++;
            }
        }
    }
    return count;
}

//+------------------------------------------------------------------+
//| Close all positions with our magic number                         |
//+------------------------------------------------------------------+
void CloseAllPositions()
{
    for(int i = PositionsTotal() - 1; i >= 0; i--)
    {
        if(positionInfo.SelectByIndex(i))
        {
            if(positionInfo.Magic() == MagicNumber)
            {
                ulong ticket = positionInfo.Ticket();
                if(trade.PositionClose(ticket))
                {
                    Print("Closed position: ", ticket);
                    BridgeNotifyTradeClosed(ticket, positionInfo.Profit());
                }
            }
        }
    }
}

//+------------------------------------------------------------------+
//| Apply trailing stop to all positions                              |
//+------------------------------------------------------------------+
void ApplyTrailingStop()
{
    for(int i = PositionsTotal() - 1; i >= 0; i--)
    {
        if(positionInfo.SelectByIndex(i))
        {
            if(positionInfo.Magic() != MagicNumber || positionInfo.Symbol() != _Symbol)
                continue;

            double currentSL = positionInfo.StopLoss();
            double openPrice = positionInfo.PriceOpen();
            ulong ticket = positionInfo.Ticket();

            if(positionInfo.PositionType() == POSITION_TYPE_BUY)
            {
                double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
                double newSL = bid - TrailingSL_Points * _Point;

                if(newSL > currentSL && newSL > openPrice)
                {
                    trade.PositionModify(ticket, newSL, positionInfo.TakeProfit());
                }
            }
            else if(positionInfo.PositionType() == POSITION_TYPE_SELL)
            {
                double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
                double newSL = ask + TrailingSL_Points * _Point;

                if((currentSL == 0 || newSL < currentSL) && newSL < openPrice)
                {
                    trade.PositionModify(ticket, newSL, positionInfo.TakeProfit());
                }
            }
        }
    }
}

//+------------------------------------------------------------------+
//| Apply break even to all positions                                 |
//+------------------------------------------------------------------+
void ApplyBreakEven()
{
    for(int i = PositionsTotal() - 1; i >= 0; i--)
    {
        if(positionInfo.SelectByIndex(i))
        {
            if(positionInfo.Magic() != MagicNumber || positionInfo.Symbol() != _Symbol)
                continue;

            double currentSL = positionInfo.StopLoss();
            double openPrice = positionInfo.PriceOpen();
            ulong ticket = positionInfo.Ticket();

            // Skip if already at break even or better
            if(positionInfo.PositionType() == POSITION_TYPE_BUY)
            {
                if(currentSL >= openPrice) continue;

                double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
                if(bid >= openPrice + BreakEven_Points * _Point)
                {
                    trade.PositionModify(ticket, openPrice + _Point, positionInfo.TakeProfit());
                }
            }
            else if(positionInfo.PositionType() == POSITION_TYPE_SELL)
            {
                if(currentSL > 0 && currentSL <= openPrice) continue;

                double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
                if(ask <= openPrice - BreakEven_Points * _Point)
                {
                    trade.PositionModify(ticket, openPrice - _Point, positionInfo.TakeProfit());
                }
            }
        }
    }
}

//+------------------------------------------------------------------+
//| Apply settings from bridge JSON                                   |
//+------------------------------------------------------------------+
void ApplySettingsFromBridge(string jsonParams)
{
    // Parse JSON settings and apply
    // This is a simplified version - extend as needed
    Print("Applying settings: ", jsonParams);

    // Example: Parse lot size
    // In production, use proper JSON parsing
}

//+------------------------------------------------------------------+
//| Trade transaction handler                                         |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result)
{
    // Detect trade closed
    if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
    {
        if(trans.deal_type == DEAL_TYPE_BUY || trans.deal_type == DEAL_TYPE_SELL)
        {
            // Check if this is a close deal (has opposite position)
            if(trans.position > 0)
            {
                // Position was modified or closed
                // The bridge will detect this via position polling
            }
        }
    }
}

//+------------------------------------------------------------------+
//| Tester function - for backtesting                                 |
//+------------------------------------------------------------------+
double OnTester()
{
    // Return custom optimization criterion
    double profit = TesterStatistics(STAT_PROFIT);
    double trades = TesterStatistics(STAT_TRADES);
    double profitFactor = TesterStatistics(STAT_PROFIT_FACTOR);

    if(trades < 10) return 0;

    return profit * profitFactor;
}
//+------------------------------------------------------------------+
