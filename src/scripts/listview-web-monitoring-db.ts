$(document).ready(function() {
    $.getJSON('./config.json', function(data) {
        toggleProgressbar(true);
        let user = data["EDGI-WEB-MONITOR-USER"];
        let pass = data["EDGI-WEB-MONITOR-PASSWORD"];
        $.ajax({
            type: "GET",
            url: "https://web-monitoring-db.herokuapp.com/pages.json?page=1",
            dataType: "json",
            xhrFields: {
                withCredentials: true
            },
            headers: {
                'Authorization': 'Basic ' + btoa(`${user}:${pass}`)
            },
            success: function(result) {
                // TODO: paginate through records
                // Currently geting small subset to test
                let pageSet = result.data.slice(0, 10); 
                let table = $('#tbl_list_view');
                let diff = $('#diff_view');

                table.find('thead').append(getTableHeader());

                pageSet.forEach(function(record, index, pageSet) {
                    let row = getTableRow(record);
                    row.data('prev_record', pageSet[index-1]);
                    row.data('next_record', pageSet[index+1]);
                    table.find('tbody').append(row);
                })
                toggleProgressbar(false);
            }
        })
    })
    
    function getTableRow(record) {
        // explicit check because this field is sometimes null
        let diff_with_first_url = record.latest.diff_with_first_url || '';

        let row = $('<tr>').attr('id', `row_record_${record.latest.id}`).append(
            $('<td>').text(record.latest.id),
            $('<td>').text(record.latest.updated_at),
            $('<td>').text(record.site),
            $('<td>').text(record.title),
            $('<td>').html(`<a href="https://${record.url}" target="_blank" rel="noopener">${record.url.substr(0, 20)}...</a>`),
            $('<td>').html(`<a href="${record.versionista_url}" target="_blank" rel="noopener">${record.versionista_url.substr(-15)}</a>`),
            $('<td>').html(`<a href="${record.latest.diff_with_previous_url}" target="_blank" rel="noopener">${record.latest.diff_with_previous_url.substr(-15)}</a>`),
            $('<td>').html(`<a href="${diff_with_first_url}" target="_blank" rel="noopener">${diff_with_first_url.substr(-15)}</a>`)
        );

        row.click(function() {
            showPage(record);
            setPagination(row.data('prev_record'), row.data('next_record'));
        });
        return row;
    }

    function showPage(record) {
        let page_id = record.id,
            version_id = record.latest.id;
        
        togglePageView();
        showDiffMetadata(record);

        // populate versionista links
        $('#lnk_last_two_diff').attr('href', record.latest.diff_with_previous_url || '');
        $('#lnk_last_to_base_diff').attr('href', record.latest.diff_with_first_url || '');

        $('#lnk_update_record').off('click').on('click', function() {
            let annotations = {};
            // Build up annotations object
            $('#inspectorView input[type="checkbox"]').each(function(chkbox) {
                annotations[this.id] = this.checked;
            })
            update(page_id, version_id, annotations);
        })
    }

    // post annotations to web-monitoring-db
    function update(page_id, version_id, annotations) {
        //TODO: Need some sort of user login
        $.getJSON('./config.json', function(data) {
            let user = data["EDGI-WEB-MONITOR-USER"];
            let pass = data["EDGI-WEB-MONITOR-PASSWORD"];
            $.ajax({    
                type: "POST",
                url: `https://web-monitoring-db.herokuapp.com/pages/${page_id}/versions/${version_id}/annotations.json`,
                dataType: "json",
                xhrFields: {
                    withCredentials: true
                },
                headers: {
                    'Authorization': 'Basic ' + btoa(`${user}:${pass}`)
                },
                data: JSON.stringify(annotations),
                success: function(result) {
                    alert('updated')
                }
            })
        })
    }

    function showDiffMetadata(record) {
        let page_id = record.id,
            version_id = record.latest.id || 'No index',
            title = record.title || 'No title',
            url = record.url || 'No url';

        $('#diff_title').text(`${version_id} - ${title}`);
        $('#diff_page_url').attr('href', `
        ${url}`).text(`${url.substr(0, 40)}...`).attr('target', '_blank');

        // Get annotations and check checkboxes
        // annotation keys and checkbox element id's correspond
        $.ajax({
            cache: false,
            url: `https://web-monitoring-db.herokuapp.com/pages/${page_id}/versions/${version_id}`,
            dataType: "json",
            success: function(data) {
                let current_annotation = data.data.current_annotation;
                if (Object.keys(current_annotation).length > 0) {
                    Object.keys(current_annotation).forEach(function(key) {
                        $(`#${key}`).prop('checked', current_annotation[key]);
                    });
                } else {
                    $('#inspectorView input[type="checkbox"]').each(function() {
                        $(this).prop('checked', false);
                    })
                }
            }
        });               
    }

    function setPagination(prev_record, next_record) {
        if (prev_record) {
            $('#prev_index').show().off().click(function() {
                showPage(prev_record);
                let row = $(`#row_record_${prev_record.latest.id}`);
                setPagination(row.data('prev_record'), row.data('next_record'));
            })
        } else { $('#prev_index').hide(); }

        if (next_record) {
            $('#next_index').show().off().click(function() {
                showPage(next_record);
                let row = $(`#row_record_${next_record.latest.id}`);
                setPagination(row.data('prev_record'), row.data('next_record'));
            })
        } else { $('#next_index').hide() }
    }
});

function toggleListView() {
    $('#container_list_view').show();
    $('#container_page_view').hide();
}

function togglePageView() {
    $('#container_list_view').hide();
    $('#container_page_view').show();
}

function toggleProgressbar(isVisible: boolean) {
    if(isVisible) {
        $('.progress').show();
    } else {
        $('.progress').hide();
    }
}