DocumentHelper = {
  ad: UltraEdit.activeDocument,
  ow: UltraEdit.outputWindow,
  
  getCurLine: function() {
    this.ad.selectLine()
    return this.ad.selection
  }
}

var Breadcrumbs = function() {
  var ad = UltraEdit.activeDocument
  var ow = UltraEdit.outputWindow
  
  function findIndentationLevel(item) {
    var regexpResult = /^\s*/.exec(item)
    var indentationLevel = regexpResult.length != 0 ? regexpResult[0].length : 0
    return indentationLevel
  }

  function trimRight(str) {
      return str.replace(/\s+$/, '');
  } 

  return {
    array: [],
    
    buildForItem: function(item) {
      // Store the current document line in order to restore it later
      var initialLine = ad.currentLineNum
    
      var curItem = item
      var atRoot = false
      var atFirstLine = false
      var nextLine = initialLine + 1
    
      // Repeat, until the current item is root or first line has been reached
      do {
          // Put the current item at front of the deque
          this.array.unshift(curItem)
          
          // Find parent item of the current item and let it be current
          var curIndentationLevel = findIndentationLevel(curItem)
          if (curIndentationLevel == 0) {
            atRoot = true;
          }
          while (!atRoot && !atFirstLine) {
            // Go one line back
            ad.gotoLine(ad.currentLineNum - 1)
            if (ad.currentLineNum == 1) {
              atFirstLine = true
            }
            // Retrieve an item from the previous line and check its indentation level
            prevItem = DocumentHelper.getCurLine()
            if (findIndentationLevel(prevItem) < curIndentationLevel) {
              curItem = prevItem
              break
            }
          }
      } while (!atRoot && !atFirstLine)
      
      // Restore the document line before breadcrumbs construction
      ad.gotoLine(initialLine)
    },
  
    // All breadcrumbs not contained in the input breadcrumbs
    substract: function(breadcrumbs) {
      var result = new Breadcrumbs()
      // Extract all items contained in first breadcrumbs, but not contained in second ones
      for (i = 0; i < Math.min(this.array.length, breadcrumbs.array.length); i++) {
        if (this.array[i] != breadcrumbs.array[i]) {
          result.array.push(this.array[i])
        }
      }
      if (this.array.length > breadcrumbs.array.length) {
        result.array = result.array.concat(this.array.slice(breadcrumbs.array.length))
      }
      return result;
    },
    
    print: function() {
      this.array.forEach(function(item) {
        ow.write(trimRight(item))
      }) 
    }       
  } 
}

var GTDSearchExecutor = function() {
  var ad = UltraEdit.activeDocument
  var ow = UltraEdit.outputWindow
  
  var initLine = 0
  var initCol = 0

  function initSearch() {
    ad.tabsToSpaces()
    ad.top()
    ow.showWindow(true)
  }
  
  function storeInitialDocumentPos() {
    initLine = ad.currentLineNum
    initCol = ad.currentColumnNum
  }
  
  function restoreInitialDocumentPos() {
    ad.gotoLine(initLine, initCol)
  }

  return {
    searchByText: function() {
      var searchStr = UltraEdit.getString("Search string:", 1)
      if (!searchStr) {
        return
      }

      storeInitialDocumentPos()      
      initSearch()
            
      var lastBreadcrumbs = new Breadcrumbs()
      do {
        ad.findReplace.find(searchStr)
        if (!ad.isFound()) {
          break; 
        }
      
        // Build breadcrumbs for the found item
        var breadcrumbs = new Breadcrumbs();
        breadcrumbs.buildForItem(DocumentHelper.getCurLine());
        
        // Output breadcrumbs parts that are not contained in last breadcrumbs
        breadcrumbsDiff = breadcrumbs.substract(lastBreadcrumbs)
        ow.write(breadcrumbsDiff.print())
        
        lastBreadcrumbs = breadcrumbs 
      
        // Continue from the next line  
        ad.gotoLine(ad.currentLineNum + 1)
      } while(ad.isFound())
      
      restoreInitialDocumentPos()
    }  
  }  
}

var searchExecutor = new GTDSearchExecutor()
searchExecutor.searchByText()
