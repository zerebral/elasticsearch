import buildRequestFilter from "./buildRequestFilter";

function buildFrom(current, resultsPerPage) {
  if (!current || !resultsPerPage) return;
  return (current - 1) * resultsPerPage;
}

function buildSort(sortDirection, sortField, sortList) {
  if (sortList) {
    return sortList
  } else if (sortDirection && sortField) {
    return [{ [`${sortField}.keyword`]: sortDirection }];
  }
}

function buildMatch(searchTerm) {
  console.log("Search Term - " + searchTerm);
  return searchTerm
    ? {
        multi_match: {
          query: searchTerm,
          fields: ["source", "source_s"]
        }
      }
    : { match_all: {} };
}

/*

  Converts current application state to an Elasticsearch request.

  When implementing an onSearch Handler in Search UI, the handler needs to take the
  current state of the application and convert it to an API request.

  For instance, there is a "current" property in the application state that you receive
  in this handler. The "current" property represents the current page in pagination. This
  method converts our "current" property to Elasticsearch's "from" parameter.

  This "current" property is a "page" offset, while Elasticsearch's "from" parameter
  is a "item" offset. In other words, for a set of 100 results and a page size
  of 10, if our "current" value is "4", then the equivalent Elasticsearch "from" value
  would be "40". This method does that conversion.

  We then do similar things for searchTerm, filters, sort, etc.
*/
export default function buildRequest(state) {
  const {
    current,
    filters,
    resultsPerPage,
    searchTerm,
    sortDirection,
    sortField,
    sortList
  } = state;

  const sort = buildSort(sortDirection, sortField, sortList);
  const match = buildMatch(searchTerm);
  const size = resultsPerPage;
  const from = buildFrom(current, resultsPerPage);
  const filter = buildRequestFilter(filters);

  const body = {
    // Static query Configuration
    // --------------------------
    // https://www.elastic.co/guide/en/elasticsearch/reference/7.x/search-request-highlighting.html
    // highlight: {
    //   fragment_size: 200,
    //   number_of_fragments: 1,
    //   fields: {
    //     title: {},
    //     description: {}
    //   }
    // },
    //https://www.elastic.co/guide/en/elasticsearch/reference/7.x/search-request-source-filtering.html#search-request-source-filtering
    _source: ["id", "seller_name", "url", "seed_id", "seed_group_id", "seed_group_name", "meta_description", "meta_keywords", "vertical_id"],
     aggs: {
       seed_group_id: { terms: { field: "seed_group_id.keyword"} }//,
       //seed_group_name: { terms: { field: "seed_group_name.keyword" }}
    //   //city: { terms: { field: "city" }},
    //   //state: { terms: { field: "state" }}
    //   /*visitors : {
    //     range: {
    //       field: "visitors",
    //       ranges: [
    //         { from: 0.0, to: 10000.0, key: "0 - 10000" },
    //         { from: 10001.0, to: 100000.0, key: "10001 - 100000" },
    //         { from: 100001.0, to: 500000.0, key: "100001 - 500000" },
    //         { from: 500001.0, to: 1000000.0, key: "500001 - 1000000" },
    //         { from: 1000001.0, to: 5000000.0, key: "1000001 - 5000000" },
    //         { from: 5000001.0, to: 10000000.0, key: "5000001 - 10000000" },
    //         { from: 10000001.0, key: "10000001+" }
    //       ]
    //     }
    //   },
    //   acres: {
    //     range: {
    //       field: "acres",
    //       ranges: [
    //         { from: -1.0, key: "Any" },
    //         { from: 0.0, to: 1000.0, key: "Small" },
    //         { from: 1001.0, to: 100000.0, key: "Medium" },
    //         { from: 100001.0, key: "Large" }
    //       ]
    //     }
    //   }*/
     },

    // Dynamic values based on current Search UI state
    // --------------------------
    // https://www.elastic.co/guide/en/elasticsearch/reference/7.x/full-text-queries.html
    query: {
      bool: {
        must: [match],
        ...(filter && { filter })
      }
    },
    // https://www.elastic.co/guide/en/elasticsearch/reference/7.x/search-request-sort.html
    ...(sort && { sort }),
    // https://www.elastic.co/guide/en/elasticsearch/reference/7.x/search-request-from-size.html
    ...(size && { size }),
    ...(from && { from })
  };

  console.log("ES Request - ", body);
  return body;
}
