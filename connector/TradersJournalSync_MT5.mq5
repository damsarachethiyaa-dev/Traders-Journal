#property strict
#property version   "1.05"
#property description "Local-only, read-only Traders Journal sync for MetaTrader 5."
#property description "This EA never opens, closes, edits, or copies trades."

input string ConnectionCode = "";
input string ApiBaseUrl = "http://127.0.0.1:8765";
input int SyncIntervalSeconds = 5;
input int HeartbeatIntervalSeconds = 90;
input int ReconcileIntervalSeconds = 900;

string g_device_token = "";
bool g_sync_requested = true;
datetime g_last_reconcile = 0;
datetime g_last_heartbeat = 0;
datetime g_import_start_time = 0;
datetime g_import_end_time = 0;
bool g_sync_open_positions = true;
bool g_sync_enabled = true;
int g_sync_request_version = 0;
int g_completed_request_version = 0;
string g_next_trigger = "automatic";
int g_retry_attempt = 0;
datetime g_retry_after = 0;
int g_last_http_error = 0;
int g_heartbeat_interval_seconds = 90;
int g_reconcile_interval_seconds = 900;

struct TradeAggregate
{
   ulong position_id;
   string symbol;
   string side;
   datetime entry_time;
   datetime exit_time;
   double entry_value;
   double entry_volume;
   double exit_value;
   double exit_volume;
   double profit;
   double commission;
   double swap;
   double stop_loss;
   double take_profit;
   string comment;
   bool active;
};

int OnInit()
{
   if(!IsLocalApiUrl(ApiBaseUrl))
   {
      Print("Traders Journal: only a local HTTP URL is allowed, for example http://127.0.0.1:8765.");
      return INIT_PARAMETERS_INCORRECT;
   }
   EventSetTimer(MathMax(2, SyncIntervalSeconds));
   g_heartbeat_interval_seconds = MathMax(60, HeartbeatIntervalSeconds);
   g_reconcile_interval_seconds = MathMax(300, ReconcileIntervalSeconds);
   LoadDeviceToken();
   if(g_device_token == "")
      PairDevice();
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   if(g_device_token != "")
      SendOffline(reason);
   EventKillTimer();
}

void OnTradeTransaction(
   const MqlTradeTransaction &transaction,
   const MqlTradeRequest &request,
   const MqlTradeResult &result
)
{
   g_sync_requested = true;
}

void OnTimer()
{
   if(g_device_token == "")
   {
      PairDevice();
      return;
   }

   datetime now = TimeTradeServer();
   if(now - g_last_heartbeat >= g_heartbeat_interval_seconds)
   {
      SendHeartbeat();
      g_last_heartbeat = now;
   }

   if(!g_sync_enabled || now < g_retry_after)
      return;

   if(!FlushPendingPayload())
      return;

   if(g_sync_requested || now - g_last_reconcile >= g_reconcile_interval_seconds)
   {
      if(SyncTradeHistory(g_next_trigger))
      {
         g_sync_requested = false;
         g_last_reconcile = now;
         g_completed_request_version = g_sync_request_version;
         g_next_trigger = "automatic";
         ResetRetry();
      }
   }
}

bool PairDevice()
{
   string code = Trim(ConnectionCode);
   if(code == "")
   {
      Print("TradersJournal Sync: enter the connection code in EA Inputs.");
      return false;
   }

   string body = "{";
   body += "\"code\":\"" + EscapeJson(code) + "\",";
   body += "\"platform\":\"mt5\",";
   body += "\"deviceId\":\"" + EscapeJson(DeviceId()) + "\",";
   body += "\"terminalBuild\":" + IntegerToString((int)TerminalInfoInteger(TERMINAL_BUILD)) + ",";
   body += "\"account\":" + AccountJson();
   body += "}";

   string response = "";
   int status = HttpPost("/api/metatrader/pair", body, "", response);
   if(status != 200)
   {
      PrintHttpError("pair", status, response);
      return false;
   }

   string token = ReadJsonString(response, "token");
   if(token == "")
   {
      Print("TradersJournal Sync: server did not return a device token.");
      return false;
   }

   g_device_token = token;
   ApplyServerSettings(response);
   SaveDeviceToken();
   g_sync_requested = true;
   Print("TradersJournal Sync: connected. Initial history import starting.");
   return true;
}

bool SendHeartbeat()
{
   string body = "{";
   body += "\"account\":" + AccountJson() + ",";
   body += "\"terminalBuild\":" + IntegerToString((int)TerminalInfoInteger(TERMINAL_BUILD));
   body += "}";

   string response = "";
   int status = HttpPost("/api/metatrader/heartbeat", body, g_device_token, response);
   if(status == 401)
   {
      ClearDeviceToken();
      return false;
   }
   if(status != 200)
   {
      PrintHttpError("heartbeat", status, response);
      return false;
   }
   ApplyServerSettings(response);
   return true;
}

void SendOffline(int reason)
{
   string body = "{";
   body += "\"account\":" + AccountJson() + ",";
   body += "\"reason\":" + IntegerToString(reason);
   body += "}";

   string response = "";
   int status = HttpPost("/api/metatrader/offline", body, g_device_token, response);
   if(status != 200 && status != 401)
      PrintHttpError("offline update", status, response);
}

bool SyncTradeHistory(string trigger)
{
   TradeAggregate records[];
   if(!BuildTradeAggregates(records))
      return false;

   int total = ArraySize(records);
   string run_id = DeviceId() + "-" + IntegerToString((int)TimeTradeServer());
   if(total == 0)
      return SendTradeBatch(records, 0, 0, run_id, trigger, 0, 1);

   const int batch_size = 100;
   int batch_count = (total + batch_size - 1) / batch_size;
   for(int start = 0; start < total; start += batch_size)
   {
      int count = MathMin(batch_size, total - start);
      int batch_index = start / batch_size;
      if(!SendTradeBatch(records, start, count, run_id, trigger, batch_index, batch_count))
         return false;
   }
   return true;
}

bool BuildTradeAggregates(TradeAggregate &records[])
{
   ArrayResize(records, 0);
   datetime now = TimeTradeServer();
   datetime history_end = g_import_end_time > 0 ? MathMin(g_import_end_time, now) : now;
   if(!HistorySelect(g_import_start_time, history_end))
   {
      Print("TradersJournal Sync: unable to read account history. Error ", GetLastError());
      return false;
   }

   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
   {
      ulong deal_ticket = HistoryDealGetTicket(i);
      if(deal_ticket == 0)
         continue;

      ENUM_DEAL_TYPE deal_type = (ENUM_DEAL_TYPE)HistoryDealGetInteger(deal_ticket, DEAL_TYPE);
      if(deal_type != DEAL_TYPE_BUY && deal_type != DEAL_TYPE_SELL)
         continue;

      ulong position_id = (ulong)HistoryDealGetInteger(deal_ticket, DEAL_POSITION_ID);
      if(position_id == 0)
         position_id = deal_ticket;

      int index = FindOrAddAggregate(records, position_id);
      ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(deal_ticket, DEAL_ENTRY);
      double volume = HistoryDealGetDouble(deal_ticket, DEAL_VOLUME);
      double price = HistoryDealGetDouble(deal_ticket, DEAL_PRICE);
      datetime deal_time = (datetime)HistoryDealGetInteger(deal_ticket, DEAL_TIME);

      records[index].symbol = HistoryDealGetString(deal_ticket, DEAL_SYMBOL);
      records[index].profit += HistoryDealGetDouble(deal_ticket, DEAL_PROFIT);
      records[index].commission += HistoryDealGetDouble(deal_ticket, DEAL_COMMISSION)
         + HistoryDealGetDouble(deal_ticket, DEAL_FEE);
      records[index].swap += HistoryDealGetDouble(deal_ticket, DEAL_SWAP);
      double stop_loss = HistoryDealGetDouble(deal_ticket, DEAL_SL);
      double take_profit = HistoryDealGetDouble(deal_ticket, DEAL_TP);
      if(stop_loss > 0)
         records[index].stop_loss = stop_loss;
      if(take_profit > 0)
         records[index].take_profit = take_profit;

      if(entry == DEAL_ENTRY_IN || entry == DEAL_ENTRY_INOUT)
      {
         if(records[index].entry_time == 0 || deal_time < records[index].entry_time)
         {
            records[index].entry_time = deal_time;
            records[index].side = deal_type == DEAL_TYPE_BUY ? "LONG" : "SHORT";
            records[index].comment = HistoryDealGetString(deal_ticket, DEAL_COMMENT);
         }
         records[index].entry_value += price * volume;
         records[index].entry_volume += volume;
      }

      if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY || entry == DEAL_ENTRY_INOUT)
      {
         records[index].exit_value += price * volume;
         records[index].exit_volume += volume;
         if(deal_time > records[index].exit_time)
            records[index].exit_time = deal_time;
      }
   }

   if(!g_sync_open_positions)
   {
      RemoveIncompleteAggregates(records);
      return true;
   }

   for(int position_index = 0; position_index < PositionsTotal(); position_index++)
   {
      ulong ticket = PositionGetTicket(position_index);
      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;
      datetime position_time = (datetime)PositionGetInteger(POSITION_TIME);
      if(g_import_end_time > 0 && position_time > g_import_end_time)
         continue;

      ulong position_id = (ulong)PositionGetInteger(POSITION_IDENTIFIER);
      int index = FindOrAddAggregate(records, position_id);
      records[index].active = true;
      records[index].symbol = PositionGetString(POSITION_SYMBOL);
      records[index].side = PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY ? "LONG" : "SHORT";
      records[index].stop_loss = PositionGetDouble(POSITION_SL);
      records[index].take_profit = PositionGetDouble(POSITION_TP);
      records[index].profit += PositionGetDouble(POSITION_PROFIT);
      records[index].swap = PositionGetDouble(POSITION_SWAP);
      if(records[index].entry_time == 0)
      {
         records[index].entry_time = (datetime)PositionGetInteger(POSITION_TIME);
         records[index].entry_volume = PositionGetDouble(POSITION_VOLUME);
         records[index].entry_value = PositionGetDouble(POSITION_PRICE_OPEN) * records[index].entry_volume;
      }
   }
   RemoveIncompleteAggregates(records);
   return true;
}

int FindOrAddAggregate(TradeAggregate &records[], ulong position_id)
{
   for(int i = 0; i < ArraySize(records); i++)
   {
      if(records[i].position_id == position_id)
         return i;
   }

   int index = ArraySize(records);
   ArrayResize(records, index + 1);
   records[index].position_id = position_id;
   records[index].symbol = "";
   records[index].side = "";
   records[index].entry_time = 0;
   records[index].exit_time = 0;
   records[index].entry_value = 0;
   records[index].entry_volume = 0;
   records[index].exit_value = 0;
   records[index].exit_volume = 0;
   records[index].profit = 0;
   records[index].commission = 0;
   records[index].swap = 0;
   records[index].stop_loss = 0;
   records[index].take_profit = 0;
   records[index].comment = "";
   records[index].active = false;
   return index;
}

void RemoveIncompleteAggregates(TradeAggregate &records[])
{
   int valid_count = 0;
   int total = ArraySize(records);
   for(int i = 0; i < total; i++)
   {
      bool complete = records[i].position_id > 0
         && records[i].symbol != ""
         && (records[i].side == "LONG" || records[i].side == "SHORT")
         && records[i].entry_time > 0
         && records[i].entry_volume > 0
         && records[i].entry_value > 0;
      if(!records[i].active)
         complete = complete
            && records[i].exit_time > 0
            && records[i].exit_volume > 0
            && records[i].exit_value > 0;

      if(!complete)
      {
         Print("TradersJournal Sync: skipped incomplete position ", UlongToString(records[i].position_id), ".");
         continue;
      }
      if(valid_count != i)
         records[valid_count] = records[i];
      valid_count++;
   }
   ArrayResize(records, valid_count);
}

bool SendTradeBatch(
   TradeAggregate &records[],
   int start,
   int count,
   string run_id,
   string trigger,
   int batch_index,
   int batch_count
)
{
   string body = "{";
   body += "\"account\":" + AccountJson() + ",";
   body += "\"cursor\":\"" + IntegerToString((int)TimeTradeServer()) + "\",";
   body += "\"snapshot\":true,";
   body += "\"runId\":\"" + EscapeJson(run_id) + "\",";
   body += "\"trigger\":\"" + trigger + "\",";
   body += "\"batchIndex\":" + IntegerToString(batch_index) + ",";
   body += "\"batchCount\":" + IntegerToString(batch_count) + ",";
   body += "\"requestVersion\":" + IntegerToString(g_sync_request_version) + ",";
   body += "\"trades\":[";

   for(int i = 0; i < count; i++)
   {
      if(i > 0)
         body += ",";
      body += TradeJson(records[start + i]);
   }
   body += "]}";

   string response = "";
   int status = HttpPost("/api/metatrader/trades", body, g_device_token, response);
   if(status == 200)
   {
      ResetRetry();
      return true;
   }
   if(status == 401)
      ClearDeviceToken();
   if(IsPermanentPayloadError(status))
      g_sync_requested = true;
   else
      SavePendingPayload(body);
   ScheduleRetry();
   PrintHttpError("trade sync", status, response);
   return false;
}

string TradeJson(TradeAggregate &record)
{
   double entry_price = record.entry_volume > 0 ? record.entry_value / record.entry_volume : 0;
   double exit_price = record.exit_volume > 0 ? record.exit_value / record.exit_volume : 0;
   string status = record.active ? "open" : "closed";

   string json = "{";
   json += "\"externalId\":\"" + UlongToString(record.position_id) + "\",";
   json += "\"symbol\":\"" + EscapeJson(record.symbol) + "\",";
   json += "\"side\":\"" + record.side + "\",";
   json += "\"status\":\"" + status + "\",";
   json += "\"entryTime\":\"" + IsoTime(record.entry_time) + "\",";
   if(status == "closed")
   {
      json += "\"exitTime\":\"" + IsoTime(record.exit_time) + "\",";
      json += "\"exitPrice\":" + JsonNumber(exit_price) + ",";
   }
   else
   {
      json += "\"exitTime\":null,\"exitPrice\":null,";
   }
   json += "\"sourceUpdatedAt\":\"" + IsoTime(TimeTradeServer()) + "\",";
   json += "\"entryPrice\":" + JsonNumber(entry_price) + ",";
   json += "\"quantity\":" + JsonNumber(MathMax(record.entry_volume, 0.00000001)) + ",";
   json += "\"profit\":" + JsonNumber(record.profit) + ",";
   json += "\"commission\":" + JsonNumber(record.commission) + ",";
   json += "\"swap\":" + JsonNumber(record.swap) + ",";
   json += "\"stopLoss\":" + NullableNumber(record.stop_loss) + ",";
   json += "\"takeProfit\":" + NullableNumber(record.take_profit) + ",";
   json += "\"comment\":\"" + EscapeJson(record.comment) + "\"";
   json += "}";
   return json;
}

string AccountJson()
{
   string json = "{";
   json += "\"login\":\"" + UlongToString((ulong)AccountInfoInteger(ACCOUNT_LOGIN)) + "\",";
   json += "\"name\":\"" + EscapeJson(AccountInfoString(ACCOUNT_NAME)) + "\",";
   json += "\"server\":\"" + EscapeJson(AccountInfoString(ACCOUNT_SERVER)) + "\",";
   json += "\"company\":\"" + EscapeJson(AccountInfoString(ACCOUNT_COMPANY)) + "\",";
   json += "\"currency\":\"" + EscapeJson(AccountInfoString(ACCOUNT_CURRENCY)) + "\",";
   json += "\"leverage\":" + IntegerToString((int)AccountInfoInteger(ACCOUNT_LEVERAGE));
   json += "}";
   return json;
}

int HttpPost(string path, string body, string token, string &response)
{
   char request_data[];
   char response_data[];
   string response_headers = "";
   string headers = "Content-Type: application/json\r\n";
   if(token != "")
      headers += "Authorization: Bearer " + token + "\r\n";

   StringToCharArray(body, request_data, 0, WHOLE_ARRAY, CP_UTF8);
   if(ArraySize(request_data) > 0)
      ArrayResize(request_data, ArraySize(request_data) - 1);

   ResetLastError();
   int status = WebRequest(
      "POST",
      TrimRight(ApiBaseUrl, "/") + path,
      headers,
      10000,
      request_data,
      response_data,
      response_headers
   );
   g_last_http_error = status == -1 ? GetLastError() : 0;
   response = ArraySize(response_data) > 0
      ? CharArrayToString(response_data, 0, WHOLE_ARRAY, CP_UTF8)
      : "";
   if(g_last_http_error == 4014)
      Print("TradersJournal Sync: allow ", TrimRight(ApiBaseUrl, "/"), " under Tools > Options > Expert Advisors.");
   return status;
}

bool FlushPendingPayload()
{
   string payload = ReadTextFile(PendingFileName());
   if(payload == "")
      return true;

   string response = "";
   int status = HttpPost("/api/metatrader/trades", payload, g_device_token, response);
   if(status == 200)
   {
      FileDelete(PendingFileName(), FILE_COMMON);
      ResetRetry();
      return true;
   }
   if(status == 401)
      ClearDeviceToken();
   if(IsPermanentPayloadError(status))
   {
      FileDelete(PendingFileName(), FILE_COMMON);
      g_sync_requested = true;
      Print("TradersJournal Sync: discarded an invalid queued snapshot and will rebuild it.");
      return true;
   }
   ScheduleRetry();
   PrintHttpError("queued trade sync", status, response);
   return false;
}

void ScheduleRetry()
{
   g_retry_attempt = MathMin(g_retry_attempt + 1, 6);
   int delay = (int)MathMin(60, MathPow(2, g_retry_attempt));
   g_retry_after = TimeTradeServer() + delay;
}

void ResetRetry()
{
   g_retry_attempt = 0;
   g_retry_after = 0;
}

bool IsPermanentPayloadError(int status)
{
   return status == 400 || status == 413 || status == 422;
}

void SavePendingPayload(string payload)
{
   WriteTextFile(PendingFileName(), payload);
}

void LoadDeviceToken()
{
   g_device_token = ReadTextFile(TokenFileName());
}

void SaveDeviceToken()
{
   WriteTextFile(TokenFileName(), g_device_token);
}

void ClearDeviceToken()
{
   g_device_token = "";
   FileDelete(TokenFileName(), FILE_COMMON);
   Print("TradersJournal Sync: connection was revoked or expired. Enter a new connection code.");
}

bool WriteTextFile(string name, string value)
{
   int handle = FileOpen(name, FILE_WRITE | FILE_TXT | FILE_COMMON | FILE_ANSI);
   if(handle == INVALID_HANDLE)
      return false;
   FileWriteString(handle, value);
   FileClose(handle);
   return true;
}

string ReadTextFile(string name)
{
   int handle = FileOpen(name, FILE_READ | FILE_TXT | FILE_COMMON | FILE_ANSI);
   if(handle == INVALID_HANDLE)
      return "";
   int size = (int)FileSize(handle);
   string value = size > 0 ? FileReadString(handle, size) : "";
   FileClose(handle);
   return value;
}

string TokenFileName()
{
   return "TradersJournalSync_MT5_" + DeviceId() + ".token";
}

string PendingFileName()
{
   return "TradersJournalSync_MT5_" + DeviceId() + ".pending";
}

string DeviceId()
{
   string seed = UlongToString((ulong)AccountInfoInteger(ACCOUNT_LOGIN))
      + "|" + AccountInfoString(ACCOUNT_SERVER)
      + "|" + TerminalInfoString(TERMINAL_DATA_PATH)
      + "|" + TrimRight(Trim(ApiBaseUrl), "/")
      + "|" + Trim(ConnectionCode);
   ulong hash = 2166136261;
   for(int i = 0; i < StringLen(seed); i++)
   {
      hash ^= (ulong)StringGetCharacter(seed, i);
      hash *= 16777619;
   }
   return "mt5-" + UlongToString(hash);
}

bool IsLocalApiUrl(string url)
{
   url = TrimRight(Trim(url), "/");
   StringToLower(url);
   if(url == "http://127.0.0.1" || url == "http://localhost")
      return true;
   string prefix = "http://127.0.0.1:";
   if(StringFind(url, prefix) != 0)
   {
      prefix = "http://localhost:";
      if(StringFind(url, prefix) != 0)
         return false;
   }
   string port = StringSubstr(url, StringLen(prefix));
   if(StringLen(port) == 0 || StringLen(port) > 5)
      return false;
   for(int i = 0; i < StringLen(port); i++)
   {
      ushort ch = StringGetCharacter(port, i);
      if(ch < 48 || ch > 57)
         return false;
   }
   int number = (int)StringToInteger(port);
   return number >= 1 && number <= 65535;
}

string IsoTime(datetime value)
{
   if(value <= 0)
      value = TimeTradeServer();
   string formatted = TimeToString(value, TIME_DATE | TIME_SECONDS);
   StringReplace(formatted, ".", "-");
   StringReplace(formatted, " ", "T");

   int offset = (int)(TimeTradeServer() - TimeGMT());
   string sign = offset >= 0 ? "+" : "-";
   int absolute_offset = MathAbs(offset);
   int hours = absolute_offset / 3600;
   int minutes = (absolute_offset % 3600) / 60;
   return formatted + sign + StringFormat("%02d:%02d", hours, minutes);
}

string EscapeJson(string value)
{
   StringReplace(value, "\\", "\\\\");
   StringReplace(value, "\"", "\\\"");
   StringReplace(value, "\r", "\\r");
   StringReplace(value, "\n", "\\n");
   StringReplace(value, "\t", "\\t");
   return value;
}

string ReadJsonString(string json, string key)
{
   string marker = "\"" + key + "\":\"";
   int start = StringFind(json, marker);
   if(start < 0)
      return "";
   start += StringLen(marker);
   int finish = StringFind(json, "\"", start);
   return finish > start ? StringSubstr(json, start, finish - start) : "";
}

bool ReadJsonBool(string json, string key, bool fallback)
{
   string marker = "\"" + key + "\":";
   int start = StringFind(json, marker);
   if(start < 0)
      return fallback;
   start += StringLen(marker);
   string value = StringSubstr(json, start, 5);
   return StringFind(value, "true") == 0;
}

int ReadJsonInt(string json, string key, int fallback)
{
   string marker = "\"" + key + "\":";
   int start = StringFind(json, marker);
   if(start < 0)
      return fallback;
   start += StringLen(marker);
   string value = "";
   while(start < StringLen(json))
   {
      string character = StringSubstr(json, start, 1);
      if(character < "0" || character > "9")
         break;
      value += character;
      start++;
   }
   return value == "" ? fallback : (int)StringToInteger(value);
}

void ApplyServerSettings(string response)
{
   g_heartbeat_interval_seconds = MathMax(60, ReadJsonInt(response, "heartbeatIntervalSeconds", g_heartbeat_interval_seconds));
   g_reconcile_interval_seconds = MathMax(300, ReadJsonInt(response, "reconcileIntervalSeconds", g_reconcile_interval_seconds));
   string start_date = ReadJsonString(response, "importStartDate");
   StringReplace(start_date, "-", ".");
   g_import_start_time = start_date == "" ? 0 : StringToTime(start_date);
   string end_date = ReadJsonString(response, "importEndDate");
   StringReplace(end_date, "-", ".");
   g_import_end_time = end_date == "" ? 0 : StringToTime(end_date) + 86399;
   g_sync_open_positions = ReadJsonBool(response, "syncOpenPositions", true);
   g_sync_enabled = ReadJsonBool(response, "syncEnabled", true);
   int request_version = ReadJsonInt(response, "syncRequestVersion", g_sync_request_version);
   if(request_version > g_completed_request_version)
   {
      g_sync_requested = true;
      g_next_trigger = "manual";
   }
   g_sync_request_version = request_version;
}

string JsonNumber(double value)
{
   if(!MathIsValidNumber(value))
      return "0";
   return DoubleToString(value, 8);
}

string NullableNumber(double value)
{
   return value > 0 && MathIsValidNumber(value) ? JsonNumber(value) : "null";
}

string Trim(string value)
{
   StringTrimLeft(value);
   StringTrimRight(value);
   return value;
}

string TrimRight(string value, string suffix)
{
   while(StringLen(value) > 0 && StringSubstr(value, StringLen(value) - 1) == suffix)
      value = StringSubstr(value, 0, StringLen(value) - 1);
   return value;
}

string UlongToString(ulong value)
{
   return StringFormat("%I64u", value);
}

void PrintHttpError(string action, int status, string response)
{
   if(status == -1)
      Print("TradersJournal Sync: ", action, " failed. MetaTrader error ", g_last_http_error);
   else
      Print("TradersJournal Sync: ", action, " returned HTTP ", status, " ", response);
}
