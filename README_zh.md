# SOAR
## 什麼是SOAR
SOAR 是一個資料庫存取工具，讓開發者可以用物件的方式存取資料庫資料，並且明確清楚的知道程式如何存取資料。SOAR 讓開發者享有一部分 ORM 的便利，但避免了 ORM 的諸多缺點。

## 為什麼需要 SOAR:
在程式中組合 SQL 是一件很不方便的事。既容易出錯，又不容易維護。後來有ORM的出現，讓程式的撰寫可以比較乾淨。可是ORM本身也可以搞的很複雜，尤其是資料庫中個資料表的關聯性不是很單純時。其實開發者所需要的，也許只是一個有效管理 SQL 的方法，但不要像 ORM 一樣會完全接管開發者對資料庫的存取行為。

想像一個關聯式資料庫的程式庫（node.js 模組）提供了以下的功能：

+ 可以對資料庫的查詢結果直接變成一個 Javascript 物件（單筆結果）或是陣列（多筆）。要更新資料時，則可以把一個 Javascript 物件直接寫回資料庫。

+ 與 ORM 不同的是，開發者可以完全控制最後產出的 SQL，以方便維護、除錯管理甚至效能調校。

+ 為 SQL 指令取一個名字或代號，甚至將它變成一個獨立的檔案，以方便維護管理以及重複使用。

+ 若是在程式中直接撰寫 SQL，在程式中組合查詢條件是很繁雜且容易出錯的。程式庫應該能依據所給定的查詢條件自動組合出對應的 SQL。

換言之，這個程式庫要像 ORM 一樣可以自動產生 SQL，而且將查詢結果直接轉換成程式語言中的物件。但另一方面又要可以讓開發者完全控制 SQL 是如何產出，以及資料如何載入或是更新。讓開發者非常清楚自己的程式究竟做了什麼事。

於是，有了 SOAR 的誕生

## 如何使用
以下是個簡易目錄：

+ [資料庫設定](#dbSetup)
+ [查詢單筆資料](#query)
+ [查詢多筆資料](#list)
+ [新增資料](#insert)
+ [修改資料](#update)
+ [刪除資料](#delete)
+ [資料定義檔](#dvml)
+ [資料定義檔範例](#samples)

### 資料庫設定<a name="dbSetup"></a>
資料庫的設定有二種方式：使用設定檔或是在程式中直接設定。

####使用設定檔
在 SOAR 模組的最上層目錄有一個 config.json 的設定檔，其內容大致如下：

    {
    	"dbConfig": {
    		"host"     : "127.0.0.1",
    		"database" : "soar",
    		"user"     : "myDB_acc_name",
    		"password" : "xxxx",
    		"supportBigNumbers" : true,
    		"connectionLimit"   : 64
    	}
    }

其中 **host** 代表資料庫所在的主機位置，**database** 則是資料庫的名稱。**user** 和 **password** 分別代表帳號名稱和密碼。SOAR 使用了 _mysql_ 這個 node 的模組，並自動（預設）啟動了  conntection pool 的功能。

####程式中直接設定
開發者也可以在程式中直接設定資料庫的相關參數如下例：

    var  soar = require('soarjs');
    var  options = {
                dbConfig: {
                    "host"     : "127.0.0.1",
                    "database" : "soar",
                    "user"     : "myDB_acc_name",
                    "password" : "xxxx",
                    "supportBigNumbers" : true,
                    "connectionLimit"   : 64
                }
         };
         
    soar.config( options );

### 存取資料庫
依照對資料庫執行的動作，SOAR 提供了對應的功能：

####讀取單筆資料<a name="query"></a>
語法如下：

    soar.query(options, callback);
    
其中的 **options** 參數可包含下列的屬性：

+ **vfile**: 讀取資料表的定義檔，基本上是將 SQL 整理成比較容易管理的格式。在後面的章節還會對 **vfile** 做進一步介紹。這是必要屬性。

+ **params**: 查詢條件，例如要查詢所有要姓氏是陳的使用者，可以將 **query** 設成 query = {name: '陳%'}; 這個屬性如果沒有設定，表示沒有查詢條件。

+ **fields**: 對資料庫做查詢時，其回傳欄位（就是一般 SQL SELECT 的欄位）是在 **vfile** 中定義的。如果你不想讓 SOAR 傳回所有的欄位，那麼可以用 **fields** 這個屬性來定義要回傳的欄位。例如 fields = ['name', 'addr']，則查詢結果只會回傳'name'和'addr這二個欄位。這個屬性如果沒有設定，就會傳回 **vfile** 中定義的所有欄位。

+ **conn**: 資料庫的 connetion。這個屬性大多數是不需要的，因為 SOAR 會自動向 connection pool 取得一個 connection。但是如果要執行 transaction，開發者就必須用這個屬性來指定要執行 transaction 的 connection。

至於 **callback(err, data)** 是 query 執行完成後所要呼叫的回傳函數，其參數說明如下：

+ **err**: 如果 **err** 有值，表示執行發生錯誤；否則表示執行成功。

+ **data**: 如果執行成功，**data** 為查詢即果。**data** 是一個 Javascript 物件。

以下是一個簡單的範例：

    var  options = {
                vfile: 'Person/general.dvml',
                params: {psnID: 1}
         };

    soar.query(options, function(err, data) {
        console.log('Detailed info about pserson #1:\n%s',
        			 JSON.stringify(data) );
    });
    
####讀取多筆資料<a name="list"></a>
若要一次讀取多筆資料，可用 soar.list() 來取得。其回傳值會放置在一個陣例中。語法如下：

    soar.list(options, callback);
    
其中的 **options** 參數可包含下列的屬性：

+ **vfile**: 讀取資料表的定義檔，基本上是將 SQL 整理成比較容易管理的格式。在後面的章節還會對 **vfile** 做進一步介紹。這是必要屬性。

+ **params**: 查詢條件，例如要查詢所有要姓氏是陳的使用者，可以將 **query** 設成 query = {name: '陳%'}; 這個屬性如果沒有設定，表示沒有查詢條件。

+ **fields**: 對資料庫做查詢時，其回傳欄位（就是一般 SQL SELECT 的欄位）是在 **vfile** 中定義的。如果你不想讓 SOAR 傳回所有的欄位，那麼可以用 **fields** 這個屬性來定義要回傳的欄位。例如 fields = ['name', 'addr']，則查詢結果只會回傳'name'和'addr這二個欄位。這個屬性如果沒有設定，就會傳回 **vfile** 中定義的所有欄位。

+ **range**: 用來指定回傳部分的查詢結果。**range** 是以分頁的方式，可以指定每頁的筆數，以及從第幾頁開始回傳。這個屬性如果沒有設定，表示一次傳回所有的結果。

+ **conn**: 資料庫的 connetion。這個屬性大多數是不需要的，因為 SOAR 會自動向 connection pool 取得一個 connection。但是如果要執行 transaction，開發者就必須用這個屬性來指定要執行 transaction 的 connection。

至於 **callback(err, list)** 是 list 執行完成後所要呼叫的回傳函數，其參數說明如下：

+ **err**: 如果 **err** 有值，表示執行發生錯誤；否則表示執行成功。

+ **list**: 如果執行成功，**list** 為查詢即果。**list** 是一個 Javascript 陣列。

以下是一個簡單的範例：

    var  options = {
                vfile: 'Person/general.dvml',
                params: {name: 'David %'}
         };

    soar.list(options, function(err, list) {
        console.log('How many people whose first name is David? %d',
                    list.length );
    });


**將查詢結果分頁**

如果查詢結果的筆數太多，可以用分頁的方式一次只傳回部分的結果。例如你要傳回結果中的第 21 ~ 30 筆資料，可以參考以下的範例：

    var  range = soar.newRange(3, 10),
         options = {
                vfile: 'Person/general.dvml',
                params: {name: 'David %'},
                range: range
         };

    soar.list(options, function(err, list, counts) {
        console.log('How many people whose first name is David? %d',
                    list.length );
    });

其中 **soar.newRange(pageIdx, pageSize)** 會依據頁碼和每頁包含的筆數產生一個分頁變數。之後再將產生的分頁變數設到 options 中。如果有提供分頁變數，回傳 callback 的參數會多一個 **count** 參數。**count** 參數回傳回總筆數，以方便製作分頁效果。

####新增資料<a name="insert"></a>
以下為新增一筆資料表的資料所使用的語法：

    soar.insert(options, callback);
    
其中的 **options** 參數可包含下列的屬性：

+ **entity**: 要被新增資料的資料表的名稱。必要屬性。

+ **data**: 新增資料的內容。其中 **data** 的屬性必須與資料表中的欄位名稱相同，否則會被忽略。必要屬性。

+ **conn**: 資料庫的 connetion。這個屬性大多數是不需要的，因為 SOAR 會自動向 connection pool 取得一個 connection。但是如果要執行 transaction，開發者就必須用這個屬性來指定要執行 transaction 的 connection。

至於 **callback(err, id)** 是 insert 執行完成後所要呼叫的回傳函數，其參數說明如下：

+ **err**: 如果 **err** 有值，表示執行發生錯誤；否則表示執行成功。

+ **id**: 如果執行成功，**id** 是新增資料的主鍵值。這是假設資料表的主鍵是一個會 auto-increment 的數字主鍵。

以下是一個簡單的範例：

    var  options = {
                entity: 'Person',
                data: {name: 'Scott Cooper'},
         };

    soar.insert(options, function(err, psnID) {
        console.log('The numeric ID of Scott Cooper is %d', psnID);
    });
    
####修改資料<a name="update"></a>
以下是修改資料的語法：

    soar.update(options, callback);
    
其中的 **options** 參數可包含下列的屬性：

+ **entity**: 要被修改資料的資料表的名稱。必要屬性。

+ **data**: 所要修改的資料內容。其中 **data** 的屬性必須與資料表中的欄位名稱相同，否則會被忽略。

+ **terms**: 修改資料的限定條件。注意這個屬性應該要小心設定，若未給將會修改資料表中所有的資料。

+ **conn**: 資料庫的 connetion。這個屬性大多數是不需要的，因為 SOAR 會自動向 connection pool 取得一個 connection。但是如果要執行 transaction，開發者就必須用這個屬性來指定要執行 transaction 的 connection。

至於 **callback(err)** 是 update 執行完成後所要呼叫的回傳函數，其參數說明如下：

+ **err**: 如果 **err** 有值，表示執行發生錯誤；否則表示執行成功。

以下是一個簡單的範例：

    var  options = {
                entity: 'Person',
                data: {name: 'John Cooper'},
                terms: {psnID: 1}
         };

    soar.update(options, function(err) {
    	if (!err)
            console.log('The #1 person whose name has been changed.');
    });
    
####刪除資料<a name="delete"></a>
以下是刪除資料的語法：

    soar.del(options, callback);
    
其中的 **options** 參數可包含下列的屬性：

+ **entity**: 要被刪除資料的資料表的名稱。必要屬性。

+ **terms**: 刪除資料的限定條件。注意這個屬性應該要小心設定，若未給將會刪除資料表中所有的資料。

+ **conn**: 資料庫的 connetion。這個屬性大多數是不需要的，因為 SOAR 會自動向 connection pool 取得一個 connection。但是如果要執行 transaction，開發者就必須用這個屬性來指定要執行 transaction 的 connection。

至於 **callback(err)** 是 delete 執行完成後所要呼叫的回傳函數，其參數說明如下：

+ **err**: 如果 **err** 有值，表示執行發生錯誤；否則表示執行成功。

以下是一個簡單的範例：

    var  options = {
                entity: 'Person',
                terms: {psnID: 1}
         };

    soar.del(options, function(err) {
    	if (!err)
            console.log('The #1 person has been deleted.');
    });
    
### 資料定義檔<a name="dvml"></a>
資料定義檔把 SQL 指令以 XML 的格式加以整理，以便在執行時有更大的彈性，並且方便維護管理。資料定義檔的附屬檔名是 DVML，代表 data view markup language。以下是資料定義檔的語法示意：

    <db_view>
        <table name="tableName AS abbrName1">
            <join table="tableName AS abbrName2">abbrName1.col1=abbrName2.col2</join>
        </table>
        
        <fields>
        	<field name="fieldName1" tag="name_alias2" />
        	<field name="fieldName2" tag="name_alias2" />
        </fields>
        
        <filter>
        	<filter name="psnID"	/>
        	<filter name="name"	/>
        </filter>
        
        <extra>ORDER BY name DESC</extra>
     </db_view>
     
在一個 DVML 定義檔中，有四個主要的 tag。&lt;table&gt; 用來標示資料表，相當於 SQL 中 FROM 的表示式。如果要做 JOIN，則可以在 &lt;table&gt; 下再包覆 &lt;join&gt;。至於 &lt;fields&gt; 則用來標示所要選取的欄位，相當於 SQL 中 SELECT 的部份。如果回傳欄位要用別名，則可用 tag 屬性標示。

至於 &lt;filter&gt; 是用來設定過濾條件，相當於 SQL 中 WHERE 的部份。 &lt;filter&gt; 可以重複包裹，以表示多於一個查詢條件。

&lt;extra&gt; 用來設定 SQL 中額外的設定，例如 ORDER BY 或是 GROUP BY，都可放進 &lt;extra&gt; 中。

#### 設定條件限制
資料定義檔有一個很好用的功能，就是 SOAR 會根據實際給定的條件去和 &lt;filter&gt; 裡的項目做比對。只有符合的欄位才會進入到最後所產生的 SQL。假設一個維護個人資料的資料定義檔如下：

    <db_view>
        <table name="Person" />
        <fields>
            <field name="psnID" />
            <field name="psnName" />
        </fields>
        <filter>
            <filter name="psnID" />
            <filter name="psnName" />
        </filter>
    </db_view>

然後你用以下的程式做查詢

    var  options = {
                vfile: 'Person/general.dvml',
                params: {psnID: 1}
         };

    soar.query(options, function(err, data) {
        // result...
    });

注意到雖然資料定義檔中有二個查詢條件，但程式只給了 psnID 的查詢條件，所以 SOAR 所產生的 SQL 將是：

    SELECT psnID, psnName FROM Person WHERE psnID=1;

所以開發者不需因為每次查詢方式不同，而需要去定義不同的資料定義檔。

#### 範例<a name="samples"></a>
##### 單純的查詢
透過一些 SQL 的範例就可以很清楚資料定義檔該如何使用。

    SELECT employeeID, empName FROM Employee;
    
所對應的資料定義檔應該像是：

    <db_view>
        <table name="Employee" />
        <fields>
            <field name="employeeID" />
            <field name="empName" />
        </fields>
        <filter>
            <filter name="employeeID" />
            <filter name="empName" />
        </filter>
    </db_view>
    
##### JOIN
以下顯示如何以資料定義檔做 JOIN。假設 SQL 如下：

    SELECT employeeID, empName, comp.name as corpName
    FROM Employee AS emp
    JOIN Compay AS comp ON emp.coID=comp.coID
    WHERE comp.coID=?;
    
所對應的資料定義檔應該像是：

    <db_view>
        <table name="Employee AS emp">
            <join table="Company AS comp">emp.coID=comp.coID</join>
        </table>
        
        <fields>
            <field name="employeeID" />
            <field name="empName"    />
            <field name="comp.name"  tag="corpName"/>
        </fields>
        
        <filter>
            <filter name="employeeID" />
            <filter name="empName"    />
            <filter name="corpName"  field="comp.name" />
        </filter>
    </db_view>
    
其中 comp.name 的過濾條件，使用了 **field** 的屬性。**field** 屬性標示了實際的資料表欄位，而 **name** 屬性則只是用來與程式的查詢欄位做配對。當 **name** 屬性和 **field** 屬性的值相同時，可以用 **name** 屬性來代表即可。

##### OR 過濾條件
假設你要找出年齡在 20 歲以下、60歲以上的個人資料，那麼 SQL 可能是這樣：

    SELECT psnID, psnName FROM Person WHERE age < 20 OR age > 60;
    
以下是所需要的資料定義檔：

    <db_view>
        <table name="Person" />
        
        <fields>
            <field name="psnID" />
            <field name="psnName" />
        </fields>
        
        <filter op="OR">
            <filter name="youngAge" field="age" />
            <filter name="oldAge"   field="age" />
        </filter>
    </db_view>
    
##### 更多範例
請參考 test 目錄下的測試程式，這將使你更了解 SOAR 的用法。

### 資料定義檔
#### 儲存位置
資料定義檔必須放在指定的位置，SOAR 才能正確找到所需的資料表定義。資料定義檔的預設存放位置是在 SOAR 安裝目錄下的 "def" 目錄。其中每個資料表都會有一個對應的目錄，而每一個資料表目錄下可以有不限數量的資料定義檔。不過每個資料表會有一個預設的資料定義檔叫做 "general.dvml"。當 SOAR 執行新增、修改或刪除時，就必須要參考 "general.dvml"。資料表下其餘的資料定義檔可以用來進行各種不同的查詢方式。

真正在進行程式開發時，你可能不會想要把資料定義檔存放在預設的目錄。SOAR 允許你將資料定義檔的目錄放在任何你想要的位置，只需在 config.json 檔案中加上 **defPath** 的屬性，指向你所要的目錄即可。當然，你也可以用程式設定的方式 soar.config() 去設定資料定義檔的目錄。設定方法與上述相同。

#### 產生資料定義檔
你可以手動編寫資料定義檔，尤其是你有客製的 SQL 寫法時。不過一開始的時候，SOAR 提供了 CLI 指令可以讓你一次產生所有資料表的預設定義 (general.dvml)。方法如下：

    node  cli/genAll -f configFile
    
其中 **-f** 參數用來指定設定檔的位置。如此一來，就可以一次產生所有資料表的預設定義，你已經可以用 SOAR 來存取資料庫的資料了。

### 如何做 Transaction

以下是個簡單的範例

    var  soar = require('soarjs');
    
    soar.getConnection( function(err, conn) {
        if (err)
            console.log('Failed to get DB connection.');
        else  {
            conn.beginTransaction(function(err) {
                if (err)
                    console.log('Failed to start a transaction.');
                else  {
                    // do transaction related operations here
                    var  options = {
                        entity: 'Person',
                        data: {name: 'John Cooper'},
                        terms: {psnID: 1},
                        conn: conn
                    };
                    
                    soar.update(options, function(err) {
                    	if (err)
                    		conn.rollback();
                    	else
                    		conn.commit();
                    });
                }
            });
        }
    });
    
記得將經由 _soar.getConnection()_ 取得的 connection 傳入到 **options** 中，才回正確執行 transaction。

## 關於測試
SOAR 模組本身提供了一些簡單的模組測試。要執行這些測試，必須要先建立樣本資料。在 SOAR 安裝目錄下有一個 "def" 的目錄，其中包含了 schema.sql 和 sampleData.sql 二個檔可以用來建立樣本資料。此外，你也需要調整你的 config.json 檔以及測試範例中有關資料庫的設定才會正確的通過測試檔。

## 支援的資料庫
目前 SOAR 只支援 mySQL。如果你想用 SOAR 去存取其他的資料庫，目前你只能自己寫所需要資料庫的 SQL 產生器。SOAR 的 SQL 產生器是 ./lib/sqlGenMySql.js 這支程式所支援。如果有人願意提供其他資料庫的產生器，當然是很歡迎的囉！