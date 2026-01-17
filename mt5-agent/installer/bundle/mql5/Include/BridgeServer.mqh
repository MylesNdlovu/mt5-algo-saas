//+------------------------------------------------------------------+
//|                                                  BridgeServer.mqh |
//|                                    Copyright 2026, Scalperium.    |
//|                                       https://scalperium.com      |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, Scalperium"
#property link      "https://scalperium.com"

//+------------------------------------------------------------------+
//| Bridge Server for C# Agent Communication                          |
//|                                                                   |
//| This include file enables communication between the C# pool      |
//| agent and MetaTrader 5 EAs/Indicators via file-based messaging.  |
//|                                                                   |
//| Usage: Add #include <BridgeServer.mqh> to your EA/Indicator      |
//+------------------------------------------------------------------+

//--- EA Status Structure
struct EABridgeStatus
{
    bool loaded;
    bool running;
    bool paused;
    string name;
    string symbol;
    string timeframe;
    int magicNumber;
    int openPositions;
    string indicatorSignal;
    double indicatorScore;
};

//--- Global state
bool g_BridgeInitialized = false;
bool g_TradingEnabled = true;
bool g_TradingPaused = false;
string g_CurrentSignal = "RED";
double g_SignalScore = 0.0;
int g_MagicNumber = 0;
int g_BridgePort = 8080;
string g_BridgePath = "";
string g_PendingCommand = "";
string g_PendingParams = "";

//+------------------------------------------------------------------+
//| Initialize the bridge server                                      |
//+------------------------------------------------------------------+
bool BridgeInit(int magicNumber = 0, int port = 8080)
{
    if(g_BridgeInitialized)
        return true;

    g_MagicNumber = magicNumber;
    g_BridgePort = port;

    // File-based communication - most reliable cross-broker solution
    g_BridgePath = "Bridge\\" + IntegerToString(magicNumber);

    // Create bridge directory
    if(!FolderCreate(g_BridgePath))
    {
        // Folder might already exist, that's OK
    }

    // Clean up any old files
    FileDelete(g_BridgePath + "\\command.json");
    FileDelete(g_BridgePath + "\\response.json");

    g_BridgeInitialized = true;
    g_TradingEnabled = true;
    Print("Bridge initialized - Magic: ", magicNumber, " Path: ", g_BridgePath);

    return true;
}

//+------------------------------------------------------------------+
//| Deinitialize the bridge server                                    |
//+------------------------------------------------------------------+
void BridgeDeinit()
{
    g_BridgeInitialized = false;
}

//+------------------------------------------------------------------+
//| Process bridge requests (call from OnTimer)                       |
//+------------------------------------------------------------------+
void BridgeProcess()
{
    if(!g_BridgeInitialized)
        return;

    // Check for incoming command file
    string commandFile = g_BridgePath + "\\command.json";

    if(FileIsExist(commandFile))
    {
        int handle = FileOpen(commandFile, FILE_READ | FILE_TXT | FILE_ANSI);
        if(handle != INVALID_HANDLE)
        {
            string content = "";
            while(!FileIsEnding(handle))
            {
                content += FileReadString(handle);
            }
            FileClose(handle);
            FileDelete(commandFile);

            ParseCommand(content);
        }
    }

    // Write status file periodically
    WriteStatusFile();
}

//+------------------------------------------------------------------+
//| Parse command JSON and set pending command                        |
//+------------------------------------------------------------------+
void ParseCommand(string jsonCommand)
{
    // Simple JSON parsing - extract command and params
    g_PendingCommand = "";
    g_PendingParams = "";

    // Find command field
    int cmdStart = StringFind(jsonCommand, "\"command\":");
    if(cmdStart >= 0)
    {
        int valueStart = StringFind(jsonCommand, "\"", cmdStart + 10) + 1;
        int valueEnd = StringFind(jsonCommand, "\"", valueStart);
        if(valueStart > 0 && valueEnd > valueStart)
        {
            g_PendingCommand = StringSubstr(jsonCommand, valueStart, valueEnd - valueStart);
            g_PendingCommand = StringUpper(g_PendingCommand);
        }
    }

    // Find params field
    int paramsStart = StringFind(jsonCommand, "\"params\":");
    if(paramsStart >= 0)
    {
        int braceStart = StringFind(jsonCommand, "{", paramsStart);
        if(braceStart >= 0)
        {
            int depth = 1;
            int pos = braceStart + 1;
            int len = StringLen(jsonCommand);
            while(pos < len && depth > 0)
            {
                string ch = StringSubstr(jsonCommand, pos, 1);
                if(ch == "{") depth++;
                else if(ch == "}") depth--;
                pos++;
            }
            g_PendingParams = StringSubstr(jsonCommand, braceStart, pos - braceStart);
        }
    }

    Print("Parsed command: ", g_PendingCommand, " params: ", g_PendingParams);
}

//+------------------------------------------------------------------+
//| Convert string to uppercase                                       |
//+------------------------------------------------------------------+
string StringUpper(string s)
{
    string result = s;
    StringToUpper(result);
    return result;
}

//+------------------------------------------------------------------+
//| Get pending command (returns true if command available)           |
//+------------------------------------------------------------------+
bool BridgeGetCommand(string &command, string &params)
{
    // First process any new files
    BridgeProcess();

    if(g_PendingCommand != "")
    {
        command = g_PendingCommand;
        params = g_PendingParams;
        return true;
    }
    return false;
}

//+------------------------------------------------------------------+
//| Acknowledge command was processed                                 |
//+------------------------------------------------------------------+
void BridgeAcknowledgeCommand(string command)
{
    WriteCommandResponse(true, "Command " + command + " executed");
    g_PendingCommand = "";
    g_PendingParams = "";
}

//+------------------------------------------------------------------+
//| Get signal by reference (for EA usage)                            |
//+------------------------------------------------------------------+
void BridgeGetSignal(string &signal, double &score)
{
    // Read signal from indicator file if available
    string signalFile = g_BridgePath + "\\signal.json";

    if(FileIsExist(signalFile))
    {
        int handle = FileOpen(signalFile, FILE_READ | FILE_TXT | FILE_ANSI);
        if(handle != INVALID_HANDLE)
        {
            string content = FileReadString(handle);
            FileClose(handle);

            // Parse signal from JSON
            int sigStart = StringFind(content, "\"signal\":");
            if(sigStart >= 0)
            {
                int valueStart = StringFind(content, "\"", sigStart + 9) + 1;
                int valueEnd = StringFind(content, "\"", valueStart);
                if(valueStart > 0 && valueEnd > valueStart)
                {
                    g_CurrentSignal = StringSubstr(content, valueStart, valueEnd - valueStart);
                }
            }

            // Parse score
            int scoreStart = StringFind(content, "\"score\":");
            if(scoreStart >= 0)
            {
                int valueStart = scoreStart + 8;
                int valueEnd = StringFind(content, ",", valueStart);
                if(valueEnd < 0) valueEnd = StringFind(content, "}", valueStart);
                if(valueEnd > valueStart)
                {
                    g_SignalScore = StringToDouble(StringSubstr(content, valueStart, valueEnd - valueStart));
                }
            }
        }
    }

    signal = g_CurrentSignal;
    score = g_SignalScore;
}

//+------------------------------------------------------------------+
//| Write command response                                            |
//+------------------------------------------------------------------+
void WriteCommandResponse(bool success, string message)
{
    string responseFile = g_BridgePath + "\\response.json";
    int handle = FileOpen(responseFile, FILE_WRITE | FILE_TXT | FILE_ANSI);

    if(handle != INVALID_HANDLE)
    {
        string json = StringFormat(
            "{\"success\": %s, \"message\": \"%s\", \"timestamp\": %I64d}",
            success ? "true" : "false",
            message,
            TimeCurrent()
        );
        FileWriteString(handle, json);
        FileClose(handle);
    }
}

//+------------------------------------------------------------------+
//| Write status file for C# agent to read                            |
//+------------------------------------------------------------------+
void WriteStatusFile()
{
    static datetime lastWrite = 0;

    // Only write every second
    if(TimeCurrent() - lastWrite < 1)
        return;

    lastWrite = TimeCurrent();

    string statusFile = g_BridgePath + "\\status.json";
    int handle = FileOpen(statusFile, FILE_WRITE | FILE_TXT | FILE_ANSI);

    if(handle != INVALID_HANDLE)
    {
        string json = GetStatusJson();
        FileWriteString(handle, json);
        FileClose(handle);
    }
}

//+------------------------------------------------------------------+
//| Get full status as JSON                                           |
//+------------------------------------------------------------------+
string GetStatusJson()
{
    // Account info
    double balance = AccountInfoDouble(ACCOUNT_BALANCE);
    double equity = AccountInfoDouble(ACCOUNT_EQUITY);
    double margin = AccountInfoDouble(ACCOUNT_MARGIN);
    double freeMargin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
    double profit = AccountInfoDouble(ACCOUNT_PROFIT);
    long accountNumber = AccountInfoInteger(ACCOUNT_LOGIN);
    string broker = AccountInfoString(ACCOUNT_COMPANY);
    string server = AccountInfoString(ACCOUNT_SERVER);
    int leverage = (int)AccountInfoInteger(ACCOUNT_LEVERAGE);
    string currency = AccountInfoString(ACCOUNT_CURRENCY);

    // EA status
    bool eaLoaded = true;
    bool eaRunning = g_TradingEnabled && !g_TradingPaused;
    bool eaPaused = g_TradingPaused;
    string symbol = _Symbol;
    string timeframe = PeriodToString(_Period);

    // Build JSON
    string json = StringFormat(
        "{"
        "\"health\": \"ok\","
        "\"timestamp\": %I64d,"
        "\"account\": {"
            "\"balance\": %.2f,"
            "\"equity\": %.2f,"
            "\"margin\": %.2f,"
            "\"freeMargin\": %.2f,"
            "\"profit\": %.2f,"
            "\"accountNumber\": \"%I64d\","
            "\"broker\": \"%s\","
            "\"server\": \"%s\","
            "\"leverage\": %d,"
            "\"currency\": \"%s\""
        "},"
        "\"ea\": {"
            "\"loaded\": %s,"
            "\"running\": %s,"
            "\"paused\": %s,"
            "\"name\": \"ScalperiumCopyMaster\","
            "\"symbol\": \"%s\","
            "\"timeframe\": \"%s\""
        "},"
        "\"indicator\": {"
            "\"signal\": \"%s\","
            "\"score\": %.2f"
        "},"
        "\"positions\": %s"
        "}",
        TimeCurrent(),
        balance, equity, margin, freeMargin, profit,
        accountNumber, broker, server, leverage, currency,
        eaLoaded ? "true" : "false",
        eaRunning ? "true" : "false",
        eaPaused ? "true" : "false",
        symbol, timeframe,
        g_CurrentSignal, g_SignalScore,
        GetPositionsJson()
    );

    return json;
}

//+------------------------------------------------------------------+
//| Get open positions as JSON array                                  |
//+------------------------------------------------------------------+
string GetPositionsJson()
{
    string json = "[";
    bool first = true;

    int total = PositionsTotal();
    for(int i = 0; i < total; i++)
    {
        ulong ticket = PositionGetTicket(i);
        if(ticket > 0 && PositionSelectByTicket(ticket))
        {
            if(!first) json += ",";
            first = false;

            json += StringFormat(
                "{"
                "\"ticket\": %I64u,"
                "\"symbol\": \"%s\","
                "\"type\": \"%s\","
                "\"volume\": %.2f,"
                "\"openPrice\": %.5f,"
                "\"openTime\": %I64d,"
                "\"stopLoss\": %.5f,"
                "\"takeProfit\": %.5f,"
                "\"profit\": %.2f,"
                "\"commission\": %.2f,"
                "\"swap\": %.2f,"
                "\"magicNumber\": %d,"
                "\"comment\": \"%s\""
                "}",
                ticket,
                PositionGetString(POSITION_SYMBOL),
                PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY ? "BUY" : "SELL",
                PositionGetDouble(POSITION_VOLUME),
                PositionGetDouble(POSITION_PRICE_OPEN),
                PositionGetInteger(POSITION_TIME),
                PositionGetDouble(POSITION_SL),
                PositionGetDouble(POSITION_TP),
                PositionGetDouble(POSITION_PROFIT),
                PositionGetDouble(POSITION_COMMISSION),
                PositionGetDouble(POSITION_SWAP),
                PositionGetInteger(POSITION_MAGIC),
                PositionGetString(POSITION_COMMENT)
            );
        }
    }

    json += "]";
    return json;
}

//+------------------------------------------------------------------+
//| Set indicator signal (called by indicator)                        |
//+------------------------------------------------------------------+
void BridgeSetSignal(string signal, double score = 0.0)
{
    g_CurrentSignal = signal;
    g_SignalScore = score;

    // Write signal file for EA to read
    string signalFile = g_BridgePath + "\\signal.json";
    int handle = FileOpen(signalFile, FILE_WRITE | FILE_TXT | FILE_ANSI);
    if(handle != INVALID_HANDLE)
    {
        string json = StringFormat(
            "{\"signal\": \"%s\", \"score\": %.2f, \"timestamp\": %I64d}",
            signal, score, TimeCurrent()
        );
        FileWriteString(handle, json);
        FileClose(handle);
    }
}

//+------------------------------------------------------------------+
//| Get current signal (simple string return)                         |
//+------------------------------------------------------------------+
string BridgeGetCurrentSignal()
{
    return g_CurrentSignal;
}

//+------------------------------------------------------------------+
//| Get signal score                                                  |
//+------------------------------------------------------------------+
double BridgeGetSignalScore()
{
    return g_SignalScore;
}

//+------------------------------------------------------------------+
//| Check if trading is enabled                                       |
//+------------------------------------------------------------------+
bool BridgeIsTradingEnabled()
{
    return g_TradingEnabled && !g_TradingPaused;
}

//+------------------------------------------------------------------+
//| Check if trading is paused                                        |
//+------------------------------------------------------------------+
bool BridgeIsTradingPaused()
{
    return g_TradingPaused;
}

//+------------------------------------------------------------------+
//| Set EA status (called by EA)                                      |
//+------------------------------------------------------------------+
void BridgeSetStatus(EABridgeStatus &status)
{
    g_TradingEnabled = status.running;
    g_TradingPaused = status.paused;
    g_CurrentSignal = status.indicatorSignal;
    g_SignalScore = status.indicatorScore;
}

//+------------------------------------------------------------------+
//| Notify C# agent of trade opened                                   |
//+------------------------------------------------------------------+
void BridgeNotifyTradeOpened(ulong ticket, string type, double volume,
                              double price, double sl, double tp)
{
    string eventsFile = g_BridgePath + "\\events.json";
    int handle = FileOpen(eventsFile, FILE_READ | FILE_WRITE | FILE_TXT | FILE_ANSI);

    string existingContent = "";
    if(handle != INVALID_HANDLE)
    {
        while(!FileIsEnding(handle))
        {
            existingContent += FileReadString(handle);
        }
        FileClose(handle);
    }

    // Parse existing events or start fresh
    string events = "";
    if(StringLen(existingContent) > 2)
    {
        // Remove closing bracket to append
        events = StringSubstr(existingContent, 0, StringLen(existingContent) - 1);
        events += ",";
    }
    else
    {
        events = "[";
    }

    // Add new event
    events += StringFormat(
        "{\"type\": \"TRADE_OPENED\", \"ticket\": %I64u, \"tradeType\": \"%s\", "
        "\"volume\": %.2f, \"price\": %.5f, \"sl\": %.5f, \"tp\": %.5f, \"timestamp\": %I64d}]",
        ticket, type, volume, price, sl, tp, TimeCurrent()
    );

    // Write back
    handle = FileOpen(eventsFile, FILE_WRITE | FILE_TXT | FILE_ANSI);
    if(handle != INVALID_HANDLE)
    {
        FileWriteString(handle, events);
        FileClose(handle);
    }
}

//+------------------------------------------------------------------+
//| Notify C# agent of trade closed                                   |
//+------------------------------------------------------------------+
void BridgeNotifyTradeClosed(ulong ticket, double profit)
{
    string eventsFile = g_BridgePath + "\\events.json";
    int handle = FileOpen(eventsFile, FILE_READ | FILE_WRITE | FILE_TXT | FILE_ANSI);

    string existingContent = "";
    if(handle != INVALID_HANDLE)
    {
        while(!FileIsEnding(handle))
        {
            existingContent += FileReadString(handle);
        }
        FileClose(handle);
    }

    // Parse existing events or start fresh
    string events = "";
    if(StringLen(existingContent) > 2)
    {
        events = StringSubstr(existingContent, 0, StringLen(existingContent) - 1);
        events += ",";
    }
    else
    {
        events = "[";
    }

    // Add close event
    events += StringFormat(
        "{\"type\": \"TRADE_CLOSED\", \"ticket\": %I64u, \"profit\": %.2f, \"timestamp\": %I64d}]",
        ticket, profit, TimeCurrent()
    );

    // Write back
    handle = FileOpen(eventsFile, FILE_WRITE | FILE_TXT | FILE_ANSI);
    if(handle != INVALID_HANDLE)
    {
        FileWriteString(handle, events);
        FileClose(handle);
    }
}

//+------------------------------------------------------------------+
//| Convert period to string                                          |
//+------------------------------------------------------------------+
string PeriodToString(ENUM_TIMEFRAMES tf)
{
    switch(tf)
    {
        case PERIOD_M1:  return "M1";
        case PERIOD_M5:  return "M5";
        case PERIOD_M15: return "M15";
        case PERIOD_M30: return "M30";
        case PERIOD_H1:  return "H1";
        case PERIOD_H4:  return "H4";
        case PERIOD_D1:  return "D1";
        case PERIOD_W1:  return "W1";
        case PERIOD_MN1: return "MN1";
        default: return "UNKNOWN";
    }
}
//+------------------------------------------------------------------+
