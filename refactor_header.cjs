const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// The tabs block in App.tsx
const tabsTarget = `          <div className="flex items-center space-x-4">\n            <div className="flex space-x-2">\n              <button\n                onClick={() => setCurrentView('triage')}\n                className={\`px-3 py-2 rounded-xl text-sm font-medium transition-colors \${currentView === 'triage'\n                  ? 'bg-violet-100 text-violet-700'\n                  : 'text-gray-500 hover:text-gray-700'\n                  }\`}\n              >\n                Triage Matrix\n              </button>\n              {(user.role === 'PM' || user.role === 'DEV') && (\n                <button\n                  onClick={() => setCurrentView('sprint-planner')}\n                  className={\`px-3 py-2 rounded-xl text-sm font-medium transition-colors \${currentView === 'sprint-planner'\n                    ? 'bg-violet-100 text-violet-700'\n                    : 'text-gray-500 hover:text-gray-700'\n                    }\`}\n                >\n                  Sprint Planner\n                </button>\n              )}\n            </div>\n          </div>`;

// Replace the tabs block with nothing (since it's moving out)
if (content.includes(tabsTarget)) {
    content = content.replace(tabsTarget, '');
} else {
    console.error("Tabs block not found");
}

const filterTarget = `            <div className="relative">\n              <button\n                className={\`flex items-center justify-center w-9 h-9 rounded-2xl border \${isFilterOpen ? 'bg-violet-50 border-violet-300 text-violet-600' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'} transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500\`}\n                title="Filter"\n                onClick={() => setIsFilterOpen(!isFilterOpen)}\n              >\n                <Filter className="h-4 w-4" />\n              </button>\n\n              {isFilterOpen && (\n                <>\n                  <div className="fixed inset-0 z-30" onClick={() => setIsFilterOpen(false)}></div>\n                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl py-4 px-5 z-40 border border-gray-200">\n                    <div className="flex justify-between items-center mb-4">\n                      <h3 className="text-sm font-bold text-gray-900">Filters</h3>\n                      {(filters.baStatus || filters.pmStatus || filters.devStatus) && (\n                        <button \n                          onClick={() => setFilters({ baStatus: '', pmStatus: '', devStatus: '' })}\n                          className="text-xs text-violet-600 hover:text-violet-700 font-medium"\n                        >\n                          Clear all\n                        </button>\n                      )}\n                    </div>\n                    \n                    <div className="space-y-4">\n                      <div>\n                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">BA Status</label>\n                        <select \n                          className="w-full p-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none"\n                          value={filters.baStatus}\n                          onChange={(e) => setFilters(prev => ({ ...prev, baStatus: e.target.value }))}\n                        >\n                          <option value="">All</option>\n                          <option value="Pending">Pending</option>\n                          <option value="Analysis Complete">Analysis Complete</option>\n                        </select>\n                      </div>\n\n                      <div>\n                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">PM Status</label>\n                        <select \n                          className="w-full p-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none"\n                          value={filters.pmStatus}\n                          onChange={(e) => setFilters(prev => ({ ...prev, pmStatus: e.target.value }))}\n                        >\n                          <option value="">All</option>\n                          <option value="Pending">Pending</option>\n                          <option value="Approved">Approved</option>\n                          <option value="Rejected">Rejected</option>\n                          <option value="On Hold">On Hold</option>\n                        </select>\n                      </div>\n\n                      <div>\n                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Dev Status</label>\n                        <select \n                          className="w-full p-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none"\n                          value={filters.devStatus}\n                          onChange={(e) => setFilters(prev => ({ ...prev, devStatus: e.target.value }))}\n                        >\n                          <option value="">All</option>\n                          <option value="Pending">Pending</option>\n                          <option value="Scheduled">Scheduled</option>\n                          <option value="In Progress">In Progress</option>\n                          <option value="Done">Done</option>\n                        </select>\n                      </div>\n                    </div>\n                  </div>\n                </>\n              )}\n            </div>`;


if (content.includes(filterTarget)) {
    content = content.replace(filterTarget, '');
} else {
    console.error("Filter block not found");
}


const searchEndStr = `                            </button>\n                          ))}\n                        </div>\n                      )}\n                    </>\n                  )}\n                </div>\n              )}\n            </div>`;

const searchStartIdx = content.indexOf('<div className="relative hidden md:block">');
if (searchStartIdx !== -1) {
    const searchEndIdx = content.indexOf(searchEndStr, searchStartIdx) + searchEndStr.length;
    const searchBlock = content.substring(searchStartIdx, searchEndIdx);
    content = content.replace(searchBlock, '');

    const newTabs = `          <div className="flex items-center space-x-6 h-full">\n            <button\n              onClick={() => setCurrentView('triage')}\n              className={\`h-full flex items-center border-b-2 px-1 text-sm font-bold transition-colors \${currentView === 'triage'\n                ? 'border-violet-600 text-violet-700'\n                : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'\n                }\`}\n            >\n              Triage Matrix\n            </button>\n            {(user.role === 'PM' || user.role === 'DEV') && (\n              <button\n                onClick={() => setCurrentView('sprint-planner')}\n                className={\`h-full flex items-center border-b-2 px-1 text-sm font-bold transition-colors \${currentView === 'sprint-planner'\n                  ? 'border-violet-600 text-violet-700'\n                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'\n                  }\`}\n              >\n                Sprint Planner\n              </button>\n            )}\n          </div>`;

    const subHeader = `      </header>\n\n      {/* Sub Navigation */}\n      <div className="bg-white border-b border-gray-200 sticky top-16 z-[9] shadow-sm">\n        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">\n${newTabs}\n\n          <div className="flex items-center space-x-3 my-2">\n${filterTarget}\n\n${searchBlock}\n          </div>\n        </div>\n      </div>`;

    content = content.replace('      </header>', subHeader);
    fs.writeFileSync('src/App.tsx', content);
    console.log('App.tsx updated via scripted refactoring');
} else {
    console.error("Search block not found");
}

